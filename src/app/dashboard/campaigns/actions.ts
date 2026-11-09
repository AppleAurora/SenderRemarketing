"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSchedule(input: { name:string; lineId:string; listId:string; message:string; start:string; interval:number }) {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) return {ok:false,message:"Iniciá sesión para continuar."};
 const {data:member}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!member) return {ok:false,message:"No tenés una empresa asociada."};
 const {data,error}=await supabase.rpc("create_batch_schedule",{
   p_name:input.name,p_line:input.lineId,p_list:input.listId,p_message:input.message,
   p_start:input.start,p_interval_minutes:input.interval
 });
 if(error) return {ok:false,message:error.message.includes("schema cache")||error.code==="PGRST202"?"Primero ejecutá supabase/batch_scheduler.sql en Supabase SQL Editor.":error.message};
 revalidatePath("/dashboard");
 revalidatePath("/dashboard/campaigns");
 return {ok:true,message:`Se programaron ${data?.scheduled_count||0} seguimientos como borrador. No se enviarán automáticamente hasta configurar un canal autorizado.`};
}

export async function createRotatingSchedule(input:{name:string;lineId:string;listId:string;messages:string[];start:string;interval:number}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {ok:false,message:"Iniciá sesión para continuar."};
 if(input.messages.length!==10||input.messages.some(x=>!x.trim()||x.length>4096))return {ok:false,message:"Completá las 10 versiones antes de programar."};
 const {data:member}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!member)return {ok:false,message:"No tenés una empresa asociada."};
 const {data,error}=await supabase.rpc("create_rotating_batch_schedule",{
  p_name:input.name,p_line:input.lineId,p_list:input.listId,p_messages:input.messages,
  p_start:input.start,p_interval_minutes:input.interval
 });
 if(error)return {ok:false,message:error.code==="PGRST202"||error.message.includes("schema cache")?"Falta ejecutar supabase/rotating_scheduler.sql en Supabase SQL Editor.":error.message};
 revalidatePath("/dashboard");revalidatePath("/dashboard/campaigns");
 return {ok:true,message:`Se prepararon ${data?.scheduled_count||0} mensajes usando ${data?.variants_count||10} versiones rotativas. Son borradores; no se enviarán automáticamente.`};
}

export async function createMultiLineSchedule(input:{name:string;lineIds:string[];listId:string;messages:string[];start:string;perLinePerDay:5|10;interval:number}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {ok:false,message:"Iniciá sesión para continuar."};
 if(input.lineIds.length<1||input.lineIds.length>10||new Set(input.lineIds).size!==input.lineIds.length)return {ok:false,message:"Seleccioná entre 1 y 10 líneas distintas."};
 if(input.messages.length!==10||input.messages.some(m=>!m.trim()||m.length>4096))return {ok:false,message:"Completá las 10 versiones."};
 if(![5,10].includes(input.perLinePerDay))return {ok:false,message:"Elegí 5 o 10 contactos por línea."};
 const {data,error}=await supabase.rpc("create_multiline_rotating_schedule",{
  p_name:input.name,p_lines:input.lineIds,p_list:input.listId,p_messages:input.messages,
  p_start:input.start,p_per_line_per_day:input.perLinePerDay,p_interval_minutes:input.interval
 });
 if(error)return {ok:false,message:error.code==="PGRST202"||error.message.includes("schema cache")?"Ejecutá supabase/multiline_scheduler.sql en Supabase SQL Editor.":error.message};
 revalidatePath("/dashboard");revalidatePath("/dashboard/campaigns");
 return {ok:true,message:`Programados ${data?.scheduled_count||0} borradores en ${data?.lines_count||0} líneas, con un máximo de ${data?.per_line_per_day||input.perLinePerDay} por línea al día. Todavía no se envían.`};
}
