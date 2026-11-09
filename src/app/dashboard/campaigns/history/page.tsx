import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
type RecordRow={id:string;campaign_id:string;contact_id:string;whatsapp_line_id:string;message_body:string;status:string;delivery_status?:string;scheduled_at:string;sent_at?:string|null;delivered_at?:string|null;last_error?:string|null};
export default async function DeliveryHistoryPage(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:member}=await db.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!member?.organization_id)redirect("/dashboard");
 const org=member.organization_id;
 const [{data:rows,error},{data:contacts},{data:campaigns},{data:lines}]=await Promise.all([
  db.from("scheduled_messages").select("id,campaign_id,contact_id,whatsapp_line_id,message_body,status,delivery_status,scheduled_at,sent_at,delivered_at,last_error").eq("organization_id",org).order("scheduled_at",{ascending:false}).limit(500),
  db.from("contacts").select("id,name,phone_e164").eq("organization_id",org).limit(1000),
  db.from("campaigns").select("id,name").eq("organization_id",org).limit(1000),
  db.from("whatsapp_lines").select("id,display_name").eq("organization_id",org).limit(100)
 ]);
 const items=(rows||[]) as RecordRow[];
 const names=new Map((contacts||[]).map(c=>[c.id,c.name||c.phone_e164]));
 const campaignsMap=new Map((campaigns||[]).map(c=>[c.id,c.name]));
 const linesMap=new Map((lines||[]).map(l=>[l.id,l.display_name]));
 const count=(s:string)=>items.filter(x=>x.delivery_status===s).length;
 return <main className="min-h-screen bg-[#090b12] px-5 py-8 text-slate-100 sm:px-8"><div className="mx-auto max-w-6xl">
 <Link href="/dashboard/campaigns" className="text-xs text-violet-300">← Volver a campañas</Link>
 <h1 className="mt-5 text-2xl font-semibold">Historial de mensajes</h1>
 <p className="mt-2 text-xs text-slate-400">Últimos 500 mensajes programados. Una entrega solo se confirma cuando el proveedor informa ese estado. Los contactos no se eliminan del CSV.</p>
 {error&&<p role="alert" className="mt-4 text-xs text-amber-300">Falta configurar la tabla de seguimiento o sus permisos: {error.message}</p>}
 <div className="mt-5 grid gap-3 sm:grid-cols-4">
 {([{label:"Enviados",value:count("sent")},{label:"Entregados",value:count("delivered")},{label:"Fallidos",value:count("failed")},{label:"Sin confirmar",value:items.filter(x=>!["sent","delivered","failed"].includes(x.delivery_status||"")).length}]).map(x=><div key={x.label} className="panel p-4"><p className="text-xs text-slate-400">{x.label}</p><p className="mt-2 text-2xl font-semibold">{x.value}</p></div>)}
 </div>
 <div className="panel mt-5 overflow-x-auto p-4"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-white/10 text-slate-400"><th className="p-3">Contacto</th><th className="p-3">Campaña</th><th className="p-3">Línea</th><th className="p-3">Estado</th><th className="p-3">Fecha</th><th className="p-3">Error</th></tr></thead><tbody>
 {items.map(x=><tr key={x.id} className="border-b border-white/5"><td className="p-3">{names.get(x.contact_id)||x.contact_id}</td><td className="p-3">{campaignsMap.get(x.campaign_id)||"—"}</td><td className="p-3">{linesMap.get(x.whatsapp_line_id)||"—"}</td><td className="p-3">{x.delivery_status==="not_confirmed"?x.status:x.delivery_status||x.status}</td><td className="p-3">{new Date(x.delivered_at||x.sent_at||x.scheduled_at).toLocaleString("es-AR")}</td><td className="max-w-56 break-words p-3 text-rose-300">{x.last_error||"—"}</td></tr>)}
 {!items.length&&<tr><td colSpan={6} className="p-8 text-center text-slate-400">Todavía no hay mensajes registrados.</td></tr>}
 </tbody></table></div>
 </div></main>;
}
