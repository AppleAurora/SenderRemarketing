"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
function validPhone(raw:string){const digits=raw.replace(/[^0-9]/g,"");return digits.length>=8&&digits.length<=15?digits:null;}
export async function registerPersonalLine(name:string,phone:string){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return {ok:false,message:"Iniciá sesión nuevamente."};
 const {data:membership}=await db.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!membership)return {ok:false,message:"No encontramos tu empresa."};
 const number=validPhone(phone);
 if(!number||!name.trim()||name.trim().length>80)return {ok:false,message:"Ingresá un nombre y número válido con código de país."};
 const {data:existing}=await db.from("whatsapp_lines").select("id").eq("organization_id",membership.organization_id).eq("phone_e164",number).maybeSingle();
 if(existing)return {ok:false,message:"Ese número ya está registrado en tu empresa."};
 const {error}=await db.from("whatsapp_lines").insert({organization_id:membership.organization_id,display_name:name.trim(),phone_e164:number,account_type:"personal",provider:"unconfigured",connection_status:"disconnected"});
 if(error)return {ok:false,message:error.message};
 revalidatePath("/dashboard/whatsapp/lines");revalidatePath("/dashboard");
 return {ok:true,message:"Línea registrada. La vinculación QR estará disponible cuando configuremos el servidor de sesiones."};
}
export async function removePersonalLine(id:string){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return {ok:false,message:"Iniciá sesión nuevamente."};
 const {data:membership}=await db.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!membership)return {ok:false,message:"Empresa no encontrada."};
 const {data:line}=await db.from("whatsapp_lines").select("id,connection_status").eq("id",id).eq("organization_id",membership.organization_id).eq("account_type","personal").maybeSingle();
 if(!line)return {ok:false,message:"Línea no encontrada."};
 if(line.connection_status!=="disconnected")return {ok:false,message:"Desconectá la sesión antes de eliminar esta línea."};
 const {error}=await db.from("whatsapp_lines").delete().eq("id",id).eq("organization_id",membership.organization_id);
 if(error)return {ok:false,message:"No se pudo eliminar. Puede haber campañas asociadas: "+error.message};
 revalidatePath("/dashboard/whatsapp/lines");revalidatePath("/dashboard");
 return {ok:true,message:"Línea eliminada del panel."};
}
