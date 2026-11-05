"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return <button onClick={signOut} disabled={loading} className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50">{loading ? "Saliendo..." : "Cerrar sesión"}</button>;
}
