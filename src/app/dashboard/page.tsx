import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import {
  CalendarClock, ChevronRight, CircleHelp, ContactRound, LayoutDashboard,
  MessageSquare, Plus, Send, ShieldCheck, Smartphone, Users, Zap
} from "lucide-react";

function Metric({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: React.ElementType }) {
  return <article className="panel p-5">
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-400">{label}</p>
      <span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300"><Icon size={18}/></span>
    </div>
    <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value.toLocaleString("es-AR")}</p>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </article>;
}

function NavLink({ href, children, active = false }: { href: string; children: React.ReactNode; active?: boolean }) {
  return <Link href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}>{children}</Link>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return <main className="min-h-screen bg-[#090b12] p-8 text-white"><div className="mx-auto max-w-xl panel p-8"><h1 className="text-xl font-semibold">Tu espacio se está preparando</h1><p className="mt-2 text-sm text-slate-400">No encontramos una organización vinculada a esta cuenta. Cerrá sesión y volvé a ingresar; si continúa, revisaremos el registro.</p><div className="mt-5"><SignOutButton/></div></div></main>;
  }

  const orgId = membership.organization_id;
  const [{ data: org }, contactsCount, linesCount, campaignsCount, logsCount, { data: recentCampaigns }, { data: recentContacts }, { data: lines }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("whatsapp_lines").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("message_logs").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("campaigns").select("id,name,status,scheduled_at,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("contacts").select("id,name,phone_e164,consent_status,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("whatsapp_lines").select("id,display_name,phone_e164,account_type,connection_status").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(5),
  ]);

  const workspaceName = org?.name || user.user_metadata?.organization_name || "Mi espacio de trabajo";
  const totalContacts = contactsCount.count ?? 0;
  const totalLines = linesCount.count ?? 0;
  const totalCampaigns = campaignsCount.count ?? 0;
  const totalMessages = logsCount.count ?? 0;
  const dateLabel = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

  return <div className="min-h-screen bg-[#090b12] text-slate-100">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[258px] flex-col border-r border-white/[0.07] bg-[#0d1019] px-5 py-6 lg:flex">
      <Link href="/dashboard" className="mb-10 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-950/50"><Send size={18}/></div>
        <div><div className="text-[15px] font-bold tracking-tight text-white">Sender<span className="text-violet-400">Remarketing</span></div><div className="mt-0.5 text-[10px] uppercase tracking-[.17em] text-slate-500">Campaign workspace</div></div>
      </Link>
      <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-600">Workspace</p>
      <nav className="space-y-1">
        <NavLink href="/dashboard" active><LayoutDashboard size={17}/>Dashboard</NavLink>
        <NavLink href="/dashboard#contacts"><ContactRound size={17}/>Contactos</NavLink>
        <NavLink href="/dashboard#lines"><Smartphone size={17}/>Líneas WhatsApp</NavLink>
        <NavLink href="/dashboard#campaigns"><Send size={17}/>Campañas</NavLink>
        <NavLink href="/dashboard#schedule"><CalendarClock size={17}/>Programación</NavLink>
      </nav>
      <p className="mb-3 mt-9 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-600">Administración</p>
      <nav className="space-y-1">
        <NavLink href="/dashboard#activity"><Activity size={17}/>Actividad</NavLink>
        <NavLink href="/dashboard#settings"><Settings2 size={17}/>Configuración</NavLink>
      </nav>
      <div className="mt-auto rounded-2xl border border-violet-400/15 bg-violet-500/[0.07] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-300"><ShieldCheck size={15}/>Espacio privado</div>
        <p className="text-xs leading-5 text-slate-400">Tus contactos, líneas y campañas están aislados de los demás espacios de trabajo.</p>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Sesión autenticada</div>
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-200">{(user.email?.[0] || "U").toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{workspaceName}</p><p className="truncate text-[10px] text-slate-500">{user.email}</p></div>
        <SignOutButton/>
      </div>
    </aside>

    <main className="min-h-screen lg:pl-[258px]">
      <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-white/[0.07] bg-[#090b12]/90 px-5 backdrop-blur-xl sm:px-8">
        <div><p className="text-[11px] text-slate-500">Workspace <span className="px-1 text-slate-700">/</span> <span className="text-slate-300">Dashboard</span></p><p className="mt-1 text-sm font-semibold text-white">{workspaceName}</p></div>
        <div className="flex items-center gap-2 sm:gap-4"><span className="hidden text-xs text-slate-500 sm:block">{user.email}</span><span className="h-8 w-px bg-white/10"/><span className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-medium text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Cuenta conectada</span><Link href="/dashboard#settings" aria-label="Configuración" className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><CircleHelp size={17}/></Link></div>
      </header>

      <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.15em] text-violet-300">{dateLabel}</p><h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Resumen general</h1><p className="mt-2 text-sm text-slate-400">Estado real de tu espacio de trabajo.</p></div>
          <div className="flex gap-2"><Link href="/dashboard#contacts" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"><Users size={15}/>Contactos</Link><Link href="/dashboard#campaigns" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"><Plus size={16}/>Nueva campaña</Link></div>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Contactos guardados" value={totalContacts} detail="En todas tus listas" icon={Users}/>
          <Metric label="Líneas registradas" value={totalLines} detail="Conexiones de este espacio" icon={Smartphone}/>
          <Metric label="Campañas" value={totalCampaigns} detail="Borradores y programadas" icon={Send}/>
          <Metric label="Registros de mensajes" value={totalMessages} detail="Actividad almacenada" icon={MessageSquare}/>
        </div>

        <div className="mb-6 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <section className="panel p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between"><div><h2 className="text-sm font-semibold text-white">Empezá a trabajar</h2><p className="mt-1 text-xs text-slate-500">Accesos rápidos a las funciones principales.</p></div><Zap size={17} className="text-violet-300"/></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/dashboard#contacts" className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-violet-400/30 hover:bg-violet-500/[0.06]"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300"><ContactRound size={18}/></div><p className="text-sm font-semibold text-white">Gestionar contactos</p><p className="mt-1 text-xs leading-5 text-slate-500">Prepará listas e importá contactos con consentimiento.</p><div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-violet-300">Abrir módulo <ChevronRight size={13}/></div></Link>
              <Link href="/dashboard#lines" className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-violet-400/30 hover:bg-violet-500/[0.06]"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><Smartphone size={18}/></div><p className="text-sm font-semibold text-white">Administrar líneas</p><p className="mt-1 text-xs leading-5 text-slate-500">Consultá las líneas y el estado de sus conexiones.</p><div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-violet-300">Abrir módulo <ChevronRight size={13}/></div></Link>
              <Link href="/dashboard#campaigns" className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-violet-400/30 hover:bg-violet-500/[0.06]"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300"><Send size={18}/></div><p className="text-sm font-semibold text-white">Crear campañas</p><p className="mt-1 text-xs leading-5 text-slate-500">Prepará borradores y programá comunicaciones.</p><div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-violet-300">Abrir módulo <ChevronRight size={13}/></div></Link>
              <Link href="/dashboard#schedule" className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-violet-400/30 hover:bg-violet-500/[0.06]"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><CalendarClock size={18}/></div><p className="text-sm font-semibold text-white">Ver programación</p><p className="mt-1 text-xs leading-5 text-slate-500">Revisá fechas, horarios y próximos envíos.</p><div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-violet-300">Abrir módulo <ChevronRight size={13}/></div></Link>
            </div>
          </section>

          <section id="lines" className="panel p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between"><div><h2 className="text-sm font-semibold text-white">Líneas WhatsApp</h2><p className="mt-1 text-xs text-slate-500">Líneas registradas en tu espacio.</p></div><Smartphone size={17} className="text-violet-300"/></div>
            {lines?.length ? <div className="space-y-3">{lines.map(line=><div key={line.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-slate-300"><Smartphone size={16}/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{line.display_name}</p><p className="mt-1 truncate text-[10px] text-slate-500">{line.phone_e164 || "Número pendiente"} · {line.account_type === "business" ? "WhatsApp Business" : "WhatsApp"}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-medium ${line.connection_status === "connected" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{line.connection_status === "connected" ? "Conectada" : line.connection_status === "attention" ? "Revisar" : "Desconectada"}</span></div>)}</div> : <EmptyState title="Todavía no registraste líneas" description="Cuando agregues una línea autorizada, su estado aparecerá acá."/>}
          </section>
        </div>

        <section id="campaigns" className="panel mb-6 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Campañas recientes</h2><p className="mt-1 text-xs text-slate-500">Tus borradores y comunicaciones programadas.</p></div><Send size={17} className="text-violet-300"/></div>
          {recentCampaigns?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left"><thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-slate-500"><th className="pb-3 font-medium">Campaña</th><th className="pb-3 font-medium">Estado</th><th className="pb-3 font-medium">Programada</th></tr></thead><tbody>{recentCampaigns.map(c=><tr key={c.id} className="border-b border-white/[0.05] last:border-0"><td className="py-3.5 text-xs font-medium text-slate-200">{c.name}</td><td className="py-3.5"><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-slate-300">{c.status}</span></td><td className="py-3.5 text-xs text-slate-500">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString("es-AR") : "Sin programar"}</td></tr>)}</tbody></table></div> : <EmptyState title="Todavía no hay campañas" description="Tus campañas aparecerán acá cuando guardes el primer borrador."/>}
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <section id="contacts" className="panel p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Contactos recientes</h2><p className="mt-1 text-xs text-slate-500">Últimos contactos incorporados.</p></div><Users size={17} className="text-violet-300"/></div>
            {recentContacts?.length ? <div className="space-y-3">{recentContacts.map(c=><div key={c.id} className="flex items-center gap-3 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-200">{(c.name?.[0] || c.phone_e164[0] || "?").toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{c.name || "Sin nombre"}</p><p className="mt-1 truncate text-[10px] text-slate-500">{c.phone_e164}</p></div><span className="text-[10px] text-slate-500">{c.consent_status === "opted_in" ? "Aceptó recibir" : c.consent_status === "opted_out" ? "Baja" : "Sin verificar"}</span></div>)}</div> : <EmptyState title="Tu lista está vacía" description="Importá un CSV con contactos que hayan aceptado recibir comunicaciones."/>}
          </section>
          <section id="activity" className="panel p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Actividad y seguridad</h2><p className="mt-1 text-xs text-slate-500">Estado de la cuenta y del espacio.</p></div><ShieldCheck size={17} className="text-emerald-300"/></div><div className="space-y-3"><div className="flex items-start gap-3 rounded-xl bg-emerald-400/[0.06] p-3"><ShieldCheck size={16} className="mt-0.5 text-emerald-300"/><div><p className="text-xs font-medium text-emerald-200">Sesión iniciada</p><p className="mt-1 text-[10px] text-slate-400">Autenticado como {user.email}. La sesión se mantiene mediante cookies seguras y se renueva al navegar.</p></div></div><div className="flex items-start gap-3 rounded-xl bg-white/[0.025] p-3"><Users size={16} className="mt-0.5 text-violet-300"/><div><p className="text-xs font-medium text-slate-200">Rol en este espacio: {membership.role}</p><p className="mt-1 text-[10px] text-slate-500">Los datos se consultan dentro de la organización asociada a tu usuario.</p></div></div></div></section>
        </div>

        <section id="schedule" className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-5"><div className="flex items-center gap-3"><CalendarClock size={18} className="text-violet-300"/><div><h2 className="text-sm font-semibold text-white">Programación</h2><p className="mt-1 text-xs text-slate-500">Todavía no hay envíos programados. La programación se habilitará al implementar el módulo de campañas.</p></div></div></section>
        <section id="settings" className="mt-6 rounded-2xl border border-white/[0.07] bg-[#0d1019] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Cuenta y espacio de trabajo</h2><p className="mt-1 text-xs text-slate-500">{user.email} · {workspaceName}</p></div><SignOutButton/></div></section>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-5 text-[10px] text-slate-600"><span>© 2026 SenderRemarketing · Versión 0.2.0</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Base de datos conectada</span></footer>
      </div>
    </main>
  </div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-7 text-center"><p className="text-xs font-medium text-slate-300">{title}</p><p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-slate-500">{description}</p></div>;
}
