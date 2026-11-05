"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { sendWhatsAppTest } from "./actions";
import { ArrowLeft, CheckCircle2, CircleAlert, ExternalLink, MessageCircle, ShieldCheck, Smartphone } from "lucide-react";

export function WhatsAppSetup({ configured }: { configured: boolean }) {
  const [recipient, setRecipient] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [messageId, setMessageId] = useState("");
  const [busy, startTransition] = useTransition();

  function test() {
    setNotice(""); setError(""); setMessageId("");
    startTransition(async () => {
      const result = await sendWhatsAppTest(recipient);
      if (!result.ok) { setError(result.message); return; }
      setNotice(result.message);
      setMessageId(result.messageId || "");
    });
  }

  return <main className="min-h-screen bg-[#090b12] px-5 py-7 text-slate-100 sm:px-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="mb-7 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft size={15}/>Volver al dashboard</Link>
      <div className="mb-7"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-violet-300">Workspace / WhatsApp</p><h1 className="text-3xl font-semibold tracking-tight">Conexión de WhatsApp</h1><p className="mt-2 text-sm text-slate-400">Configurá la API oficial y enviá un primer mensaje de prueba a tu teléfono.</p></div>

      {notice && <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-xs text-emerald-300"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16}/>{notice}</div>{messageId && <p className="mt-2 break-all text-[10px] text-emerald-200/70">ID: {messageId}</p>}</div>}
      {error && <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-4 text-xs text-rose-300"><CircleAlert size={16} className="mt-0.5 shrink-0"/>{error}</div>}

      <section className="panel mb-5 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><MessageCircle size={20}/></div><div><h2 className="text-sm font-semibold">Método de conexión</h2><p className="mt-1 text-xs text-slate-500">WhatsApp Business Platform · Cloud API de Meta</p></div><span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] ${configured?"bg-emerald-400/10 text-emerald-300":"bg-amber-400/10 text-amber-300"}`}>{configured?"Credenciales configuradas":"Pendiente de configuración"}</span></div>
        <p className="text-xs leading-6 text-slate-400">Para probar sin tocar tu cuenta personal, Meta envía desde un número de prueba y tu WhatsApp personal recibe el mensaje como destinatario verificado. No hace falta cerrar sesión, borrar chats ni migrar tu número.</p>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300"/><p className="text-[11px] leading-5 text-slate-300">No vamos a escanear QR ni almacenar sesiones de WhatsApp Web. Las credenciales de Meta quedan únicamente en el servidor de Netlify.</p></div>
      </section>

      <section className="panel mb-5 p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Paso 1 · Preparar Meta</h2>
        <ol className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
          <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-300">1</span><span>Entrá a <a className="text-violet-300 underline" href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Meta for Developers</a> y creá una app de tipo Business si todavía no tenés una.</span></li>
          <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-300">2</span><span>Agregá el producto WhatsApp y abrí API Setup / Configuración de API.</span></li>
          <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-300">3</span><span>Usá el número de prueba que ofrece Meta. Copiá el Temporary access token y el Phone Number ID.</span></li>
          <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-300">4</span><span>En Recipient phone numbers, agregá y verificá tu número personal con el código que te envíe Meta.</span></li>
        </ol>
        <a href="https://whatsappbusiness.com/es-la/developers/developer-hub/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-300 hover:text-violet-200">Documentación oficial <ExternalLink size={13}/></a>
      </section>

      <section className="panel mb-5 p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Paso 2 · Variables de entorno en Netlify</h2>
        <p className="mt-2 text-xs leading-5 text-slate-400">Agregá estas variables en Site configuration → Environment variables. No uses el prefijo NEXT_PUBLIC_ en ninguna credencial de WhatsApp.</p>
        <div className="mt-4 space-y-2">{["WHATSAPP_ACCESS_TOKEN","WHATSAPP_PHONE_NUMBER_ID","WHATSAPP_API_VERSION=v26.0"].map(v=><div key={v} className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#0b101a] px-3 py-2.5"><code className="text-[11px] text-violet-200">{v}</code><span className="text-[10px] text-slate-600">{v.includes("=")?"opcional":"requerida"}</span></div>)}</div>
        <p className="mt-3 text-[10px] leading-5 text-slate-500">Después de guardar las variables, volvé a desplegar el sitio. El token temporal de Meta sirve para la primera prueba y vence; más adelante lo reemplazaremos por uno de larga duración.</p>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3"><Smartphone size={19} className="text-emerald-300"/><div><h2 className="text-sm font-semibold">Paso 3 · Enviar mensaje a tu WhatsApp personal</h2><p className="mt-1 text-xs text-slate-500">Usa la plantilla oficial hello_world del número de prueba de Meta.</p></div></div>
        <label className="block text-xs font-medium text-slate-300">Tu número personal (con código de país)<input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="5492231234567" className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b101a] px-3 py-3 text-sm text-white outline-none focus:border-violet-500"/></label>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">Escribilo sin espacios ni +. Para Argentina, usá 549 seguido del código de área y número. Debe estar agregado y verificado como destinatario de prueba en Meta.</p>
        <button onClick={test} disabled={busy || !configured || !recipient.trim()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">{busy?"Enviando prueba…":<><MessageCircle size={16}/>Enviar mensaje de prueba</>}</button>
      </section>
    </div>
  </main>;
}
