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

type LinkMethod="qr"|"pairing";
async function sessionRequest(lineId:string,operation:"start"|"status"|"disconnect",method?:LinkMethod){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return {ok:false,message:"Iniciá sesión nuevamente."};
 const {data:membership}=await db.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!membership)return {ok:false,message:"Empresa no encontrada."};
 const {data:line}=await db.from("whatsapp_lines").select("id,phone_e164,account_type").eq("id",lineId).eq("organization_id",membership.organization_id).eq("account_type","personal").maybeSingle();
 if(!line)return {ok:false,message:"Línea no encontrada."};
 const base=process.env.WHATSAPP_SESSION_SERVICE_URL;
 const token=process.env.WHATSAPP_SESSION_SERVICE_TOKEN;
 if(!base||!token)return {ok:false,message:"Todavía falta configurar el servidor de sesiones QR. Las líneas registradas permanecen desconectadas."};
 let url:URL;
 try{url=new URL(base);}catch{return {ok:false,message:"La URL del servidor de sesiones no es válida."};}
 if(url.protocol!=="https:")return {ok:false,message:"El servidor de sesiones debe utilizar HTTPS."};
 try{
  const response=await fetch(new URL("/v1/lines/"+encodeURIComponent(lineId)+(operation==="status"?"/status":operation==="disconnect"?"/disconnect":"/link"),url),{
   method:operation==="status"?"GET":"POST",
   headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
   ...(operation==="start"?{body:JSON.stringify({organizationId:membership.organization_id,phone:line.phone_e164,method})}:{}),
   cache:"no-store",signal:AbortSignal.timeout(12000)
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)return {ok:false,message:typeof payload.message==="string"?payload.message:"El servicio de sesiones rechazó la solicitud."};
  const status=["disconnected","pending","connected","attention"].includes(payload.status)?payload.status:"pending";
  // A session is connected only when the worker explicitly confirms it.
  if(operation==="status"||operation==="disconnect"){
   await db.from("whatsapp_lines").update({connection_status:status,last_health_check:new Date().toISOString()}).eq("id",lineId).eq("organization_id",membership.organization_id);
   revalidatePath("/dashboard/whatsapp/lines");
  }
  const qr=typeof payload.qrDataUrl==="string"&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(payload.qrDataUrl)&&payload.qrDataUrl.length<100000?payload.qrDataUrl:undefined;
  const code=typeof payload.pairingCode==="string"&&/^[A-Za-z0-9-]{8,12}$/.test(payload.pairingCode)?payload.pairingCode:undefined;
  return {ok:true,message:typeof payload.message==="string"?payload.message:"Solicitud procesada.",status,qrDataUrl:qr,pairingCode:code};
 }catch{return {ok:false,message:"No se pudo contactar al servidor de sesiones. Revisá el alojamiento y la conexión."};}
}
export async function requestPersonalLineLink(lineId:string,method:LinkMethod){return sessionRequest(lineId,"start",method);}
export async function checkPersonalLineLink(lineId:string){return sessionRequest(lineId,"status");}
export async function disconnectPersonalLine(lineId:string){return sessionRequest(lineId,"disconnect");}
