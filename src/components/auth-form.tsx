"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = { mode: "login" | "signup" };

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage(""); setError("");
    try {
      const supabase = createClient();
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email, password,
          options: { data: { organization_name: organization.trim() || "Mi espacio de trabajo" } },
        });
        if (authError) throw authError;
        if (data.session) { router.push("/dashboard"); router.refresh(); }
        else setMessage("Cuenta creada. Revisá tu correo para confirmar el registro y después iniciá sesión.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.push("/dashboard"); router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos completar la operación.");
    } finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4 py-12">
    <div className="w-full max-w-[420px] rounded-2xl border border-[#eaecf0] bg-white p-8 shadow-[0_12px_40px_rgba(16,24,40,.07)]">
      <div className="mb-8 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#635bff] text-white">SR</div><div><div className="text-base font-bold">Sender<span className="text-[#635bff]">Remarketing</span></div><div className="text-[10px] uppercase tracking-[.15em] text-[#98a2b3]">Campaign workspace</div></div></div>
      <h1 className="text-2xl font-bold tracking-tight">{isSignup ? "Crear tu espacio" : "Bienvenido de nuevo"}</h1>
      <p className="mt-2 text-sm text-[#667085]">{isSignup ? "Registrá tu empresa para empezar a organizar contactos y campañas." : "Iniciá sesión para entrar a tu espacio de trabajo."}</p>
      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        {isSignup && <label className="block text-xs font-semibold text-[#344054]">Nombre de empresa o espacio<input value={organization} onChange={e=>setOrganization(e.target.value)} placeholder="Mi empresa" className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-3 text-sm font-normal outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/10" /></label>}
        <label className="block text-xs font-semibold text-[#344054]">Correo electrónico<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nombre@empresa.com" className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-3 text-sm font-normal outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/10" /></label>
        <label className="block text-xs font-semibold text-[#344054]">Contraseña<input type="password" required minLength={8} autoComplete={isSignup ? "new-password" : "current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-3 text-sm font-normal outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/10" /></label>
        {error && <p role="alert" className="rounded-lg bg-[#fef3f2] p-3 text-xs text-[#b42318]">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-[#ecfdf3] p-3 text-xs text-[#027a48]">{message}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-[#635bff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5148e5] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Procesando..." : isSignup ? "Crear cuenta" : "Iniciar sesión"}</button>
      </form>
      <p className="mt-6 text-center text-xs text-[#667085]">{isSignup ? "¿Ya tenés una cuenta?" : "¿Todavía no tenés cuenta?"} <Link className="font-semibold text-[#635bff] hover:underline" href={isSignup ? "/login" : "/signup"}>{isSignup ? "Iniciar sesión" : "Crear cuenta"}</Link></p>
      <p className="mt-8 text-center text-[10px] leading-4 text-[#98a2b3]">Tus datos se guardan en un espacio privado. La separación entre empresas se aplica en la base de datos.</p>
    </div>
  </main>;
}
