"use client";
import {useState,useTransition} from "react";
import Link from "next/link";
import {changeCampaignState} from "./actions";
type Campaign={id:string;name:string;status:string;scheduled_at:string|null;created_at:string};
const labels:Record<string,string>={draft:"Borrador",scheduled:"Programada",running:"Activa",paused:"Pausada",completed:"Finalizada",cancelled:"Cancelada"};
export function CampaignManager({campaigns}:{campaigns:Campaign[]}){
 const [busy,startTransition]=useTransition();const [notice,setNotice]=useState("");
 function change(id:string,action:"start"|"pause"|"resume"|"cancel"){
  if(action==="cancel"&&!window.confirm("¿Cancelar definitivamente los mensajes pendientes de esta campaña?"))return;
  startTransition(async()=>{const result=await changeCampaignState(id,action);setNotice(result.message);if(result.ok)window.location.reload();});
 }
 return <section className="panel mt-6 p-5 sm:p-6">
 <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Administrar campañas</h2><Link href="/dashboard/campaigns/history" className="rounded-lg border border-violet-400/30 px-3 py-2 text-xs text-violet-200">Ver entregas y errores</Link></div>
 <p className="mt-2 text-xs text-slate-400">Activá, pausá, reanudá o cancelá campañas. Los controles gestionan la programación; todavía no hay envíos automáticos.</p>
 {notice&&<p role="status" className="mt-3 rounded-lg border border-white/10 p-3 text-xs">{notice}</p>}
 <div className="mt-4 space-y-3">{campaigns.map(c=><article key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-4">
 <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{c.name}</h3><p className="mt-1 text-xs text-slate-400">{labels[c.status]||c.status} · {c.scheduled_at?new Date(c.scheduled_at).toLocaleString("es-AR"):"Sin fecha"}</p></div>
 <div className="flex flex-wrap gap-2">
 {(c.status==="draft"||c.status==="scheduled")&&<button disabled={busy} onClick={()=>change(c.id,"start")} className="rounded-lg bg-violet-600 px-3 py-2 text-xs disabled:opacity-40">Activar</button>}
 {c.status==="running"&&<button disabled={busy} onClick={()=>change(c.id,"pause")} className="rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-300 disabled:opacity-40">Pausar</button>}
 {c.status==="paused"&&<button disabled={busy} onClick={()=>change(c.id,"resume")} className="rounded-lg bg-violet-600 px-3 py-2 text-xs disabled:opacity-40">Reanudar</button>}
 {["draft","scheduled","running","paused"].includes(c.status)&&<button disabled={busy} onClick={()=>change(c.id,"cancel")} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-300 disabled:opacity-40">Cancelar</button>}
 </div></article>)}{campaigns.length===0&&<p className="text-xs text-slate-400">Todavía no creaste campañas.</p>}</div>
 </section>;
}
