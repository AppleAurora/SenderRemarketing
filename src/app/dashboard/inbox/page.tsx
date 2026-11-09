import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {InboxWorkspace} from "./inbox-workspace";
export default async function InboxPage(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:member}=await db.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!member?.organization_id)redirect("/dashboard");
 const org=member.organization_id;
 const [{data:sent,error:sendError},{data:replies,error:replyError},{data:contacts},{data:campaigns},{data:lines}]=await Promise.all([
 db.from("scheduled_messages").select("contact_id,campaign_id,whatsapp_line_id,scheduled_at,status").eq("organization_id",org).order("scheduled_at",{ascending:false}).limit(1000),
 db.from("inbox_replies").select("id,contact_id,campaign_id,whatsapp_line_id,body,received_at").eq("organization_id",org).order("received_at",{ascending:false}).limit(1000),
 db.from("contacts").select("id,name,phone_e164").eq("organization_id",org).limit(1000),
 db.from("campaigns").select("id,name").eq("organization_id",org).limit(1000),
 db.from("whatsapp_lines").select("id,display_name").eq("organization_id",org).limit(100)
 ]);
 const contactMap=new Map((contacts||[]).map(c=>[c.id,c]));
 const campaignMap=new Map((campaigns||[]).map(c=>[c.id,c.name]));
 const lineMap=new Map((lines||[]).map(l=>[l.id,l.display_name]));
 const latest=new Map<string,{contact_id:string;campaign_id:string;whatsapp_line_id:string;scheduled_at:string}>();
 for(const s of sent||[]){if(!["sent","processing"].includes(s.status))continue;if(!latest.has(s.contact_id))latest.set(s.contact_id,s);}
 const replyMap=new Map<string,{body:string;received_at:string}>();
 for(const r of replies||[])if(!replyMap.has(r.contact_id))replyMap.set(r.contact_id,r);
 const chats=Array.from(latest.values()).map(s=>{const c=contactMap.get(s.contact_id),r=replyMap.get(s.contact_id);return {id:s.contact_id,name:c?.name||c?.phone_e164||"Contacto",phone:c?.phone_e164||"",campaign:campaignMap.get(s.campaign_id)||"Campaña",line:lineMap.get(s.whatsapp_line_id)||"Línea",lastSent:s.scheduled_at,reply:r?.body||null,repliedAt:r?.received_at||null};});
 return <main className="min-h-screen bg-[#090b12] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
 <Link href="/dashboard" className="text-xs text-violet-300">← Dashboard</Link>
 <h1 className="mt-5 text-2xl font-semibold">Inbox de chats</h1>
 <p className="mt-2 text-sm text-slate-400">Filtrá contactos con respuesta y sin respuesta. La lectura automática de mensajes entrantes se habilitará al conectar el proveedor.</p>
 {(sendError||replyError)&&<p role="alert" className="mt-4 rounded-lg border border-amber-400/20 p-3 text-xs text-amber-300">Faltan migraciones SQL del inbox o programación. {replyError?.message||sendError?.message}</p>}
 <InboxWorkspace chats={chats}/></div></main>;
}
