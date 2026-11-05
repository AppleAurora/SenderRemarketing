import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppSetup } from "./whatsapp-setup";

export default async function WhatsAppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member?.organization_id) redirect("/dashboard");
  const configured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  return <WhatsAppSetup configured={configured}/>;
}
