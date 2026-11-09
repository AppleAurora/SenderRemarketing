import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
type Report={sent:number;not_sent:number;replied:number;unanswered:number;lines:{id:string;name:string;phone:string|null;sent:number}[]};
export default async function ReportsPage({searchParams}:{searchParams:Promise<{campaign?:string}>}){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:member}=await db.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!member?.organization_id)redirect("/dashboard");
 const {campaign}=await searchParams;
 const [{data:campaigns},{data,error}]=await Promise.all([
 db.from("campaigns").select("id,name").eq("organization_id",member.organization_id).order("created_at",{ascending:false}).limit(200),
 db.rpc("campaign_report",{p_campaign:campaign||null})
 ]);
 const report=(data||{sent:0,not_sent:0,replied:0,unanswered:0,lines:[]}) as Report;
 const max=Math.max(1,...report.lines.map(x=>x.sent));
 return <main className="min-h-screen bg-[#090b12] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
 <Link href="/dashboard" className="text-xs text-violet-300">← Dashboard</Link>
 <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">Reportes</h1><p className="mt-2 text-sm text-slate-400">Envíos, respuestas y actividad de cada línea.</p></div>
 <form method="get"><label htmlFor="campaign" className="mb-1 block text-xs text-slate-400">Campaña</label><select id="campaign" name="campaign" defaultValue={campaign||""} className="rounded-xl border border-white/10 bg-[#151826] px-3 py-2 text-sm" onChange={undefined}><option value="">Todas las campañas</option>{(campaigns||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="ml-2 rounded-xl bg-violet-600 px-4 py-2 text-sm">Aplicar</button></form></div>
 {error&&<p role="alert" className="mt-5 rounded-xl border border-amber-400/20 p-4 text-sm text-amber-300">Para habilitar los reportes ejecutá supabase/campaign_reports.sql y las migraciones previas. {error.message}</p>}
 <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 {([{label:"Enviados",value:report.sent},{label:"Sin enviar",value:report.not_sent},{label:"Respondieron",value:report.replied},{label:"Sin respuesta",value:report.unanswered}]).map(m=><article key={m.label} className="rounded-2xl border border-white/10 bg-[#10131e] p-5"><p className="text-sm text-slate-400">{m.label}</p><p className="mt-3 text-3xl font-semibold">{m.value.toLocaleString("es-AR")}</p></article>)}
 </div>
 <section className="mt-6 rounded-2xl border border-white/10 bg-[#10131e] p-5 sm:p-6"><h2 className="text-lg font-semibold">Mensajes enviados por número</h2><p className="mt-1 text-xs text-slate-400">Se cuentan los mensajes registrados como enviados; no se confunden con entregas confirmadas.</p>
 <div className="mt-5 space-y-5">{report.lines.map(line=><div key={line.id}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span>{line.name} <span className="text-xs text-slate-500">{line.phone||"Número no registrado"}</span></span><strong>{line.sent.toLocaleString("es-AR")}</strong></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{width:`${100*line.sent/max}%`}}/></div></div>)}{!report.lines.length&&<p className="text-sm text-slate-400">Todavía no hay líneas registradas.</p>}</div></section>
 <p className="mt-4 text-xs text-slate-500">Los mensajes sin enviar incluyen pendientes, cancelados y fallidos. Las respuestas se contabilizan si se registraron después del mensaje correspondiente. Los resultados dependen de la sincronización del proveedor.</p>
 </div></main>;
}
