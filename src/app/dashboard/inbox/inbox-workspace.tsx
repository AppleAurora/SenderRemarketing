"use client";
import {useMemo,useState} from "react";
type Chat={id:string;name:string;phone:string;campaign:string;line:string;lastSent:string;reply:string|null;repliedAt:string|null};
export function InboxWorkspace({chats}:{chats:Chat[]}){
 const [filter,setFilter]=useState<"all"|"waiting"|"replied">("all");
 const [query,setQuery]=useState("");
 const filtered=useMemo(()=>chats.filter(c=>(filter==="all"||(filter==="replied"?!!c.reply:!c.reply))&&(`${c.name} ${c.phone} ${c.campaign}`.toLowerCase().includes(query.toLowerCase()))),[chats,filter,query]);
 const replied=chats.filter(c=>!!c.reply).length;
 return <section className="mt-6 rounded-2xl border border-white/10 bg-[#10131e] p-4 sm:p-6">
 <div className="flex flex-wrap gap-2">{([{key:"all",label:`Todos (${chats.length})`},{key:"waiting",label:`Sin respuesta (${chats.length-replied})`},{key:"replied",label:`Respondidos (${replied})`} ] as const).map(x=><button key={x.key} onClick={()=>setFilter(x.key)} aria-pressed={filter===x.key} className={`rounded-xl px-4 py-2 text-xs font-semibold ${filter===x.key?"bg-violet-600 text-white":"border border-white/10 text-slate-300"}`}>{x.label}</button>)}</div>
 <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nombre, teléfono o campaña" aria-label="Buscar chats" className="mt-4 w-full rounded-xl border border-white/10 bg-[#090b12] px-4 py-3 text-sm text-white outline-none focus:border-violet-400"/>
 <div className="mt-4 divide-y divide-white/10">{filtered.map(c=><article key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
 <div><p className="text-sm font-semibold text-white">{c.name}</p><p className="mt-1 text-xs text-slate-400">{c.phone} · {c.campaign} · {c.line}</p><p className="mt-2 text-xs text-slate-300">{c.reply||"Todavía no respondió"}</p></div>
 <div className="text-right"><p className={`text-xs ${c.reply?"text-emerald-300":"text-amber-300"}`}>{c.reply?"Respondido":"Sin respuesta"}</p><p className="mt-1 text-[11px] text-slate-500">{new Date(c.repliedAt||c.lastSent).toLocaleString("es-AR")}</p></div>
 </article>)}{!filtered.length&&<p className="py-10 text-center text-sm text-slate-400">No hay chats en este filtro.</p>}</div>
 </section>;
}
