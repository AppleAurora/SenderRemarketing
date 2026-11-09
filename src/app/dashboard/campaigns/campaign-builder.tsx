"use client";
import {useState,useTransition} from "react";
import Link from "next/link";
import {createSchedule} from "./actions";
import {ArrowLeft,CalendarClock,Send,ShieldCheck} from "lucide-react";
type Item={id:string;name:string};
type Line={id:string;display_name:string;connection_status:string};
export function CampaignBuilder({lists,lines}:{lists:Item[];lines:Line[]}){
 const [name,setName]=useState("");
 const [list,setList]=useState(lists[0]?.id||"");
 const [line,setLine]=useState(lines[0]?.id||"");
 const [message,setMessage]=useState("Hola {{nombre}}, ¿cómo estás? Te escribimos para hacer seguimiento de tu consulta.");
 const [date,setDate]=useState("");
 const [variants,setVariants]=useState<string[]>([]);
 const [variantDraft,setVariantDraft]=useState("");
 const [interval,setInterval]=useState(30);
 const [feedback,setFeedback]=useState("");
 const [busy,startTransition]=useTransition();
 function addVariant(){
  const value=variantDraft.trim();
  if(!value||variants.includes(value)||variants.length>=10)return;
  setVariants([...variants,value]);setVariantDraft("");
 }
 function selectVariant(value:string){setMessage(value);}
 function submit(){
  setFeedback("");
  if(!date||!name.trim()||!list||!line||!message.trim()){setFeedback("Completá todos los campos.");return;}
  const parsed=new Date(date);
  if(Number.isNaN(parsed.getTime())){setFeedback("La fecha no es válida.");return;}
  startTransition(async()=>{
   const result=await createSchedule({name,lineId:line,listId:list,message,start:parsed.toISOString(),interval});
   setFeedback(result.message);
  });
 }
 return <main className="min-h-screen bg-[#090b12] px-5 py-8 text-slate-100 sm:px-8"><div className="mx-auto max-w-4xl">
 <Link href="/dashboard" className="mb-7 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft size={15}/>Volver al dashboard</Link>
 <div className="mb-7"><p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-violet-300">Campañas / Programador</p><h1 className="text-3xl font-semibold">Programar seguimientos</h1><p className="mt-2 text-sm text-slate-400">Mensajes de texto personalizados, distribuidos por lote y con máximo de 20 reservas diarias por línea.</p></div>
 <section className="panel space-y-5 p-6">
 <label className="block text-xs text-slate-300">Nombre de campaña<input value={name} onChange={e=>setName(e.target.value)} placeholder="Seguimiento de clientes" className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b101a] p-3 text-sm text-white"/></label>
 <div className="grid gap-4 sm:grid-cols-2">
 <label className="block text-xs text-slate-300">Lista de contactos<select value={list} onChange={e=>setList(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b101a] p-3 text-sm text-white"><option value="">Seleccionar lista</option>{lists.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
 <label className="block text-xs text-slate-300">Línea asignada<select value={line} onChange={e=>setLine(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b101a] p-3 text-sm text-white"><option value="">Seleccionar línea</option>{lines.map(x=><option key={x.id} value={x.id}>{x.display_name} · {x.connection_status}</option>)}</select></label>
 </div>
 <label className="block text-xs text-slate-300">Mensaje de texto<textarea rows={5} value={message} onChange={e=>setMessage(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b101a] p-3 text-sm text-white"/></label>
 <p className="text-[11px] text-slate-500">Usá {"{{nombre}}"} para insertar automáticamente el nombre de cada contacto. El mensaje se guarda individualmente para cada destinatario.</p>
 <section className="rounded-xl border border-violet-400/20 bg-violet-400/[0.04] p-4">
 <h2 className="text-sm font-semibold text-violet-200">Asistente de versiones del mensaje</h2>
 <p className="mt-2 text-xs leading-5 text-slate-400">Prepará hasta 10 alternativas con la misma propuesta. Revisalas antes de usarlas. Cambiar palabras no garantiza evitar filtros de spam; enviá únicamente a contactos que aceptaron recibir comunicaciones.</p>
 <label className="mt-3 block text-xs text-slate-300">Nueva versión<textarea rows={3} maxLength={2000} value={variantDraft} onChange={e=>setVariantDraft(e.target.value)} placeholder="Escribí una alternativa manteniendo la misma oferta y condiciones" className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b101a] p-3 text-sm text-white"/></label>
 <button type="button" disabled={!variantDraft.trim()||variants.length>=10} onClick={addVariant} className="mt-3 rounded-lg border border-violet-400/30 px-3 py-2 text-xs font-semibold text-violet-200 disabled:opacity-40">Agregar versión</button>
 {variants.length>0&&<div className="mt-4 space-y-2">{variants.map((v,i)=><div key={i} className="rounded-lg border border-white/10 p-3"><p className="whitespace-pre-wrap text-xs text-slate-200">{v}</p><div className="mt-3 flex gap-2"><button type="button" onClick={()=>selectVariant(v)} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs">Usar esta versión</button><button type="button" onClick={()=>setVariants(variants.filter((_,j)=>j!==i))} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Quitar</button></div></div>)}</div>}
 <p className="mt-3 text-[11px] text-slate-500">Por ahora las alternativas son borradores en este editor; solo se guarda el texto elegido al programar. La generación automática y la rotación por destinatario todavía no están conectadas.</p>
 </section>
 <div className="grid gap-4 sm:grid-cols-2">
 <label className="block text-xs text-slate-300">Fecha y hora inicial<input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b101a] p-3 text-sm text-white"/></label>
 <label className="block text-xs text-slate-300">Intervalo entre mensajes (minutos)<input type="number" min={5} max={1440} value={interval} onChange={e=>setInterval(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b101a] p-3 text-sm text-white"/></label>
 </div>
 <div className="flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={17}/><p className="text-xs leading-5 text-slate-300">Solo se incluyen contactos con consentimiento registrado. El planificador distribuye las reservas en días siguientes al alcanzar 20 por línea. Esta versión crea borradores programados; todavía no realiza envíos.</p></div>
 {feedback&&<p role="status" className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-200">{feedback}</p>}
 <button disabled={busy||!lists.length||!lines.length} onClick={submit} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"><CalendarClock size={17}/>{busy?"Programando…":"Guardar programación"}</button>
 </section>
 {(!lists.length||!lines.length)&&<p className="mt-4 text-xs text-amber-300">Para programar necesitás una lista de contactos y una línea registrada en tu empresa.</p>}
 </div></main>;
}
