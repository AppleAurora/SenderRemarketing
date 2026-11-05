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
