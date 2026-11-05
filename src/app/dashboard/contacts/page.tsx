import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactsWorkspace } from "./contacts-workspace";

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member?.organization_id) redirect("/dashboard");
  const [{ data: contacts }, { data: lists }] = await Promise.all([
    supabase.from("contacts").select("id,name,phone_e164,email,consent_status,created_at,contact_list_id").eq("organization_id", member.organization_id).order("created_at", { ascending: false }).limit(500),
    supabase.from("contact_lists").select("id,name,created_at").eq("organization_id", member.organization_id).order("created_at", { ascending: false }),
  ]);
  return <ContactsWorkspace initialContacts={contacts || []} initialLists={lists || []}/>;
}
