"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function normalizePhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export async function sendWhatsAppTest(recipientInput: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión venció. Iniciá sesión nuevamente." };
  const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member?.organization_id) return { ok: false, message: "No encontramos tu espacio de trabajo." };

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v26.0";
  if (!token || !phoneNumberId) return { ok: false, message: "Falta configurar WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en las variables de entorno de Netlify." };

  const recipient = normalizePhone(recipientInput);
  if (!recipient) return { ok: false, message: "Ingresá tu número personal con código de país, solo números. Ejemplo: 5492231234567." };

  let response: Response;
  try {
    response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: { name: "hello_world", language: { code: "en_US" } }
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "No pudimos comunicarnos con la API de WhatsApp. Revisá la conexión e intentá nuevamente." };
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result?.error?.error_user_msg || result?.error?.message || "Meta rechazó el envío.";
    return { ok: false, message: `WhatsApp respondió con un error: ${detail}` };
  }

  const messageId = result?.messages?.[0]?.id;
  const { data: existingLine } = await supabase.from("whatsapp_lines")
    .select("id")
    .eq("organization_id", member.organization_id)
    .eq("provider", "meta_cloud_api")
    .eq("display_name", "WhatsApp Cloud API · prueba")
    .maybeSingle();

  let lineId = existingLine?.id;
  if (!lineId) {
    const { data: line, error: lineError } = await supabase.from("whatsapp_lines").insert({
      organization_id: member.organization_id,
      display_name: "WhatsApp Cloud API · prueba",
      phone_e164: process.env.WHATSAPP_DISPLAY_PHONE_NUMBER || null,
      account_type: "business",
      provider: "meta_cloud_api",
      connection_status: "connected",
      last_health_check: new Date().toISOString(),
    }).select("id").single();
    if (lineError) return { ok: false, message: `El mensaje salió, pero no pudimos registrar la línea: ${lineError.message}` };
    lineId = line.id;
  } else {
    await supabase.from("whatsapp_lines").update({ connection_status: "connected", last_health_check: new Date().toISOString() }).eq("id", lineId);
  }

  await supabase.from("message_logs").insert({
    organization_id: member.organization_id,
    whatsapp_line_id: lineId,
    provider_message_id: messageId || null,
    status: "accepted",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/whatsapp");
  return { ok: true, message: "Meta aceptó el mensaje de prueba. Revisá tu WhatsApp personal.", messageId };
}
