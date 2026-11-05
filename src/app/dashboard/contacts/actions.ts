"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ImportRow = { name?: string; phone: string; email?: string; consent?: string };

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function isOptedIn(value?: string) {
  return ["si", "sí", "yes", "true", "1", "opted_in", "acepto"].includes((value || "").trim().toLowerCase());
}

async function getWorkspace() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Iniciá sesión nuevamente." as const };
  const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member?.organization_id) return { error: "No encontramos un espacio de trabajo asociado a tu cuenta." as const };
  return { supabase, user, organizationId: member.organization_id };
}

export async function importContacts(input: { listName: string; rows: ImportRow[]; consentConfirmed: boolean }) {
  const workspace = await getWorkspace();
  if ("error" in workspace) return { ok: false, message: workspace.error };
  const { supabase, user, organizationId } = workspace;

  const listName = input.listName.trim().slice(0, 80);
  if (!listName) return { ok: false, message: "Ingresá un nombre para la lista." };
  if (!Array.isArray(input.rows) || input.rows.length === 0) return { ok: false, message: "El CSV no contiene contactos válidos." };
  if (input.rows.length > 10000) return { ok: false, message: "El máximo por importación es de 10.000 filas." };

  const normalized = input.rows.map(row => ({ ...row, phone_e164: normalizePhone(row.phone || "") }));
  const invalid = normalized.filter(row => !row.phone_e164);
  if (invalid.length) return { ok: false, message: `${invalid.length} teléfonos no tienen entre 8 y 15 dígitos. Corregí el CSV e intentá nuevamente.` };

  const { data: list, error: listError } = await supabase.from("contact_lists")
    .insert({ organization_id: organizationId, name: listName, created_by: user.id })
    .select("id").single();
  if (listError || !list) return { ok: false, message: listError?.message || "No se pudo crear la lista." };

  const unique = new Map<string, typeof normalized[number]>();
  for (const row of normalized) if (!unique.has(row.phone_e164!)) unique.set(row.phone_e164!, row);
  const payload = Array.from(unique.values()).map(row => ({
    organization_id: organizationId,
    contact_list_id: list.id,
    name: (row.name || "").trim().slice(0, 120) || null,
    phone_e164: row.phone_e164!,
    email: (row.email || "").trim().slice(0, 254) || null,
    consent_status: input.consentConfirmed && isOptedIn(row.consent) ? "opted_in" : "unknown",
    consent_source: input.consentConfirmed && isOptedIn(row.consent) ? "csv_import" : null,
    consented_at: input.consentConfirmed && isOptedIn(row.consent) ? new Date().toISOString() : null,
  }));

  let imported = 0;
  for (let i = 0; i < payload.length; i += 500) {
    const { data, error } = await supabase.from("contacts")
      .upsert(payload.slice(i, i + 500), { onConflict: "organization_id,phone_e164", ignoreDuplicates: true })
      .select("id");
    if (error) return { ok: false, message: `La lista se creó, pero hubo un error al importar contactos: ${error.message}` };
    imported += data?.length || 0;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contacts");
  return { ok: true, imported, duplicates: normalized.length - unique.size, listName };
}

export async function addContact(input: { name: string; phone: string; email: string; consentConfirmed: boolean }) {
  const workspace = await getWorkspace();
  if ("error" in workspace) return { ok: false, message: workspace.error };
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, message: "Ingresá el teléfono con código de país y entre 8 y 15 dígitos." };
  const { supabase, organizationId } = workspace;
  const { error } = await supabase.from("contacts").insert({
    organization_id: organizationId,
    name: input.name.trim() || null,
    phone_e164: phone,
    email: input.email.trim() || null,
    consent_status: input.consentConfirmed ? "opted_in" : "unknown",
    consent_source: input.consentConfirmed ? "manual_confirmation" : null,
    consented_at: input.consentConfirmed ? new Date().toISOString() : null,
  });
  if (error) return { ok: false, message: error.code === "23505" ? "Ese teléfono ya existe en tu espacio de trabajo." : error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contacts");
  return { ok: true, message: "Contacto agregado correctamente." };
}

export async function deleteContact(contactId: string) {
  const workspace = await getWorkspace();
  if ("error" in workspace) return { ok: false, message: workspace.error };
  const { error } = await workspace.supabase.from("contacts").delete().eq("id", contactId).eq("organization_id", workspace.organizationId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contacts");
  return { ok: true };
}
