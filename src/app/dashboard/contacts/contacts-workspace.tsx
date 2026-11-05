"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { addContact, deleteContact, importContacts } from "./actions";
import { ArrowLeft, FileSpreadsheet, Plus, Search, Upload, Users, X, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

type Contact = { id: string; name: string | null; phone_e164: string; email: string | null; consent_status: string; created_at: string; contact_list_id: string | null };
type List = { id: string; name: string; created_at: string };

function parseCsv(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && quoted && text[i + 1] === '"') { field += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === delimiter && !quoted) { row.push(field.trim()); field = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim()); field = "";
      if (row.some(cell => cell !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field.trim());
  if (row.some(cell => cell !== "")) rows.push(row);
  if (rows.length < 2) return { headers: [], records: [] };
  const headers = rows[0].map(h => h.replace(/^\uFEFF/, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
  const find = (names: string[]) => headers.findIndex(h => names.includes(h));
  const phoneIndex = find(["phone", "telefono", "celular", "numero", "number", "whatsapp", "phone_e164"]);
  if (phoneIndex < 0) throw new Error("No encontramos una columna de teléfono. Usá phone, telefono, celular o whatsapp.");
  const nameIndex = find(["name", "nombre", "contacto", "full_name"]);
  const emailIndex = find(["email", "correo", "mail"]);
  const consentIndex = find(["consent", "consentimiento", "autorizacion", "opt_in"]);
  const records = rows.slice(1).filter(r => r[phoneIndex]?.trim()).map(r => ({
    phone: r[phoneIndex] || "",
    name: nameIndex >= 0 ? r[nameIndex] || "" : "",
    email: emailIndex >= 0 ? r[emailIndex] || "" : "",
    consent: consentIndex >= 0 ? r[consentIndex] || "" : "",
  }));
  return { headers, records };
}

export function ContactsWorkspace({ initialContacts, initialLists }: { initialContacts: Contact[]; initialLists: List[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [lists, setLists] = useState(initialLists);
  const [query, setQuery] = useState("");
  const [selectedList, setSelectedList] = useState("all");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<{name:string;phone:string;email:string;consent:string}[]>([]);
  const [listName, setListName] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newContact, setNewContact] = useState({name:"",phone:"",email:"",consentConfirmed:false});
  const [busy, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => contacts.filter(c => {
    const matches = [c.name || "", c.phone_e164, c.email || ""].some(v => v.toLowerCase().includes(query.toLowerCase()));
    return matches && (selectedList === "all" || c.contact_list_id === selectedList);
  }), [contacts, query, selectedList]);

  async function readFile(file?: File) {
    if (!file) return;
    setError(""); setNotice("");
    if (file.size > 5 * 1024 * 1024) { setError("El archivo supera los 5 MB."); return; }
    try {
      const result = parseCsv(await file.text());
      if (!result.records.length) throw new Error("El archivo no contiene filas con teléfonos.");
      if (result.records.length > 10000) throw new Error("El máximo es de 10.000 filas por importación.");
      setFileName(file.name); setParsedRows(result.records); setListName(file.name.replace(/\.csv$/i, ""));
      setShowImport(true);
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos leer el CSV."); }
  }

  function submitImport() {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await importContacts({ listName, rows: parsedRows, consentConfirmed });
      if (!result.ok) { setError(result.message); return; }
      setNotice(`Lista “${result.listName}” creada. Se importaron ${result.imported} contactos nuevos. ${result.duplicates ? `${result.duplicates} duplicados dentro del archivo fueron omitidos.` : ""}`);
      setShowImport(false); setParsedRows([]); setFileName(""); setConsentConfirmed(false);
      window.location.reload();
    });
  }

  function submitAdd() {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await addContact(newContact);
      if (!result.ok) { setError(result.message); return; }
      setNotice(result.message); setShowAdd(false); setNewContact({name:"",phone:"",email:"",consentConfirmed:false});
      window.location.reload();
    });
  }

  function removeContact(id: string) {
    if (!window.confirm("¿Eliminar este contacto del espacio de trabajo?")) return;
    startTransition(async () => {
      const result = await deleteContact(id);
      if (!result.ok) { setError(result.message); return; }
      setContacts(current => current.filter(c => c.id !== id));
      setNotice("Contacto eliminado.");
    });
  }

  return <main className="min-h-screen bg-[#090b12] px-5 py-7 text-slate-100 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard" className="mb-7 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft size={15}/>Volver al dashboard</Link>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-violet-300">Workspace / Contactos</p><h1 className="text-3xl font-semibold tracking-tight">Contactos</h1><p className="mt-2 text-sm text-slate-400">Organizá tus contactos en listas para preparar campañas.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={()=>setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold hover:bg-white/[0.08]"><Plus size={15}/>Agregar contacto</button><button onClick={()=>fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold hover:bg-violet-500"><Upload size={15}/>Importar CSV</button><input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e=>readFile(e.target.files?.[0])}/></div>
      </div>
      {notice && <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-xs text-emerald-300"><CheckCircle2 size={16}/>{notice}</div>}
      {error && <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-3 text-xs text-rose-300"><AlertCircle size={16}/>{error}</div>}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="panel p-4"><p className="text-xs text-slate-500">Contactos visibles</p><p className="mt-2 text-2xl font-semibold">{contacts.length}</p></div>
        <div className="panel p-4"><p className="text-xs text-slate-500">Listas creadas</p><p className="mt-2 text-2xl font-semibold">{lists.length}</p></div>
        <div className="panel p-4"><p className="text-xs text-slate-500">Con autorización</p><p className="mt-2 text-2xl font-semibold text-emerald-300">{contacts.filter(c=>c.consent_status==="opted_in").length}</p></div>
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] p-4">
          <div className="relative min-w-[200px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nombre, teléfono o email" className="w-full rounded-lg border border-white/10 bg-[#0b101a] py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-violet-500"/></div>
          <select value={selectedList} onChange={e=>setSelectedList(e.target.value)} className="rounded-lg border border-white/10 bg-[#0b101a] px-3 py-2.5 text-xs text-slate-200"><option value="all">Todas las listas</option>{lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
        </div>
        {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-medium">Contacto</th><th className="px-5 py-3 font-medium">Teléfono</th><th className="px-5 py-3 font-medium">Estado de consentimiento</th><th className="px-5 py-3 font-medium">Lista</th><th className="px-5 py-3"/></tr></thead><tbody>{filtered.map(c=><tr key={c.id} className="border-t border-white/[0.05]"><td className="px-5 py-3.5"><p className="text-xs font-medium text-white">{c.name || "Sin nombre"}</p><p className="mt-1 text-[10px] text-slate-500">{c.email || "Sin email"}</p></td><td className="px-5 py-3.5 text-xs text-slate-300">{c.phone_e164}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[10px] ${c.consent_status==="opted_in"?"bg-emerald-400/10 text-emerald-300":c.consent_status==="opted_out"?"bg-rose-400/10 text-rose-300":"bg-amber-400/10 text-amber-300"}`}>{c.consent_status==="opted_in"?"Autorizado":c.consent_status==="opted_out"?"Solicitó baja":"Sin verificar"}</span></td><td className="px-5 py-3.5 text-xs text-slate-500">{lists.find(l=>l.id===c.contact_list_id)?.name || "Sin lista"}</td><td className="px-5 py-3.5 text-right"><button onClick={()=>removeContact(c.id)} disabled={busy} aria-label="Eliminar contacto" className="rounded-lg p-2 text-slate-500 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 size={14}/></button></td></tr>)}</tbody></table></div> : <div className="px-5 py-16 text-center"><Users size={26} className="mx-auto text-slate-600"/><p className="mt-3 text-sm font-medium text-slate-300">No hay contactos para mostrar</p><p className="mt-1 text-xs text-slate-500">Agregá un contacto o importá tu primera lista CSV.</p></div>}
      </section>

      {showImport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#101521] p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-semibold">Importar contactos</h2><p className="mt-1 text-xs text-slate-400">{fileName} · {parsedRows.length} filas detectadas</p></div><button onClick={()=>setShowImport(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={17}/></button></div><label className="mb-4 block text-xs font-medium text-slate-300">Nombre de la lista<input value={listName} onChange={e=>setListName(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b101a] px-3 py-2.5 text-sm outline-none focus:border-violet-500"/></label><div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-xs font-semibold"><FileSpreadsheet size={16} className="text-emerald-300"/>Vista previa</div><div className="mt-2 space-y-1 text-[11px] text-slate-400">{parsedRows.slice(0,4).map((r,i)=><p key={i}>{r.name || "Sin nombre"} · {r.phone} {r.consent ? `· ${r.consent}` : ""}</p>)}</div>{parsedRows.length>4 && <p className="mt-2 text-[10px] text-slate-500">y {parsedRows.length-4} contactos más…</p>}</div><label className="flex items-start gap-2 text-xs leading-5 text-slate-300"><input type="checkbox" checked={consentConfirmed} onChange={e=>setConsentConfirmed(e.target.checked)} className="mt-1 accent-violet-500"/>Confirmo que tengo autorización verificable para contactar a las personas marcadas en el CSV con un valor afirmativo en la columna de consentimiento.</label><p className="mt-2 text-[10px] leading-4 text-slate-500">Los teléfonos sin autorización explícita se guardarán como “Sin verificar” y no deberán usarse para campañas. Los números deben incluir código de país.</p><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setShowImport(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-xs text-slate-300">Cancelar</button><button disabled={busy || !listName.trim()} onClick={submitImport} className="rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-semibold disabled:opacity-50">{busy?"Importando…":"Importar contactos"}</button></div></div></div>}

      {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101521] p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Agregar contacto</h2><button onClick={()=>setShowAdd(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={17}/></button></div><div className="space-y-3"><label className="block text-xs text-slate-300">Nombre<input value={newContact.name} onChange={e=>setNewContact({...newContact,name:e.target.value})} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b101a] px-3 py-2.5 text-sm"/></label><label className="block text-xs text-slate-300">Teléfono con código de país<input value={newContact.phone} onChange={e=>setNewContact({...newContact,phone:e.target.value})} placeholder="+549…" className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b101a] px-3 py-2.5 text-sm"/></label><label className="block text-xs text-slate-300">Email (opcional)<input value={newContact.email} onChange={e=>setNewContact({...newContact,email:e.target.value})} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b101a] px-3 py-2.5 text-sm"/></label><label className="flex items-start gap-2 text-xs leading-5 text-slate-300"><input type="checkbox" checked={newContact.consentConfirmed} onChange={e=>setNewContact({...newContact,consentConfirmed:e.target.checked})} className="mt-1 accent-violet-500"/>Confirmo que esta persona autorizó recibir comunicaciones.</label></div><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setShowAdd(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-xs text-slate-300">Cancelar</button><button onClick={submitAdd} disabled={busy || !newContact.phone.trim()} className="rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-semibold disabled:opacity-50">{busy?"Guardando…":"Guardar contacto"}</button></div></div></div>}
    </div>
  </main>;
}
