import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppSetup } from "./whatsapp-setup";

export default async function WhatsAppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member?.organization_id) redirect("/dashboard");
  const configured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  return <><div className="bg-[#090b12] px-5 pt-7 text-slate-100 sm:px-8"><div className="mx-auto max-w-4xl rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5"><h2 className="text-sm font-semibold">WhatsApp personal · Conexión por QR</h2><p className="mt-2 text-xs leading-5 text-slate-400">Ya podés registrar tus números normales de WhatsApp. La conexión QR se habilitará al configurar el servidor persistente de sesiones.</p><Link href="/dashboard/whatsapp/lines" className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white">Administrar líneas personales</Link></div></div><WhatsAppSetup configured={configured}/></>;
}
