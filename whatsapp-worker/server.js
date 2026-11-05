"use strict";
// Experimental WhatsApp Web linking worker. No message-sending endpoints.
const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const QRCode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");

const PORT = Number(process.env.PORT || 3001);
const TOKEN = process.env.WHATSAPP_SESSION_SERVICE_TOKEN;
const DATA_DIR = process.env.SESSION_DATA_DIR || "/data/whatsapp";
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS || 1);
if (!TOKEN || TOKEN.length < 32) throw Error("WHATSAPP_SESSION_SERVICE_TOKEN must contain at least 32 characters.");
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
const sessions = new Map();
function authorized(req) {
  const supplied = req.headers.authorization?.replace(/^Bearer /, "") || "";
  const a = Buffer.from(supplied), b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a,b);
}
function reply(res, code, body) {
  res.writeHead(code,{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.end(JSON.stringify(body));
}
function snapshot(s) {
  return {status:s.status,message:s.message, ...(s.qrDataUrl?{qrDataUrl:s.qrDataUrl}:{}),...(s.pairingCode?{pairingCode:s.pairingCode}:{})};
}
function createSession(id, organizationId, phone, method) {
  const s={id,organizationId,phone,status:"pending",message:"Inicializando sesión de WhatsApp Web.",qrDataUrl:null,pairingCode:null,client:null};
  const client=new Client({
    authStrategy:new LocalAuth({clientId:id,dataPath:DATA_DIR}),
    puppeteer:{headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||"/usr/bin/chromium",args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"]},
    authTimeoutMs:60000,
  });
  s.client=client;
  client.on("qr", async qr=>{
    if(s.status==="connected")return;
    s.status="pending";
    try {
      s.qrDataUrl=await QRCode.toDataURL(qr,{margin:2,width:320});
      s.message="Escaneá el QR desde Dispositivos vinculados.";
      if(method==="pairing" && !s.pairingCode){
        try{
          const code=await client.requestPairingCode(phone.replace(/\D/g,""));
          s.pairingCode=code;
          s.message="Ingresá el código en WhatsApp desde Vincular con número.";
        }catch(e){s.message="No se pudo generar el código de vinculación. Probá con QR.";console.error("pairing failed",id,e.message);}
      }
    }catch(e){s.status="attention";s.message="No se pudo generar el QR.";console.error(e);}
  });
  client.on("authenticated",()=>{s.message="Autenticación recibida. Esperando conexión.";s.qrDataUrl=null;s.pairingCode=null;});
  client.on("ready",()=>{s.status="connected";s.message="WhatsApp vinculado correctamente.";s.qrDataUrl=null;s.pairingCode=null;});
  client.on("auth_failure",()=>{s.status="attention";s.message="Falló la autenticación. Volvé a vincular el dispositivo.";s.qrDataUrl=null;s.pairingCode=null;});
  client.on("disconnected",reason=>{s.status="disconnected";s.message="Sesión desconectada. Volvé a vincular el dispositivo.";s.qrDataUrl=null;s.pairingCode=null;console.warn("disconnected",id,String(reason));});
  sessions.set(id,s);
  client.initialize().catch(e=>{s.status="attention";s.message="No se pudo iniciar WhatsApp Web.";console.error("initialize",id,e);});
  return s;
}
const server=http.createServer(async(req,res)=>{
 if(req.url==="/health"&&req.method==="GET")return reply(res,200,{ok:true,service:"whatsapp-session-worker"});
 if(!authorized(req))return reply(res,401,{message:"No autorizado."});
 const match=/^\/v1\/lines\/([a-f0-9-]{36})\/(link|status)$/.exec((req.url||"").split("?")[0]);
 if(!match)return reply(res,404,{message:"Ruta inexistente."});
 const [,id,operation]=match;
 if(operation==="status"&&req.method==="GET"){
  const s=sessions.get(id);
  return s?reply(res,200,snapshot(s)):reply(res,200,{status:"disconnected",message:"No hay una sesión activa en este servidor."});
 }
 if(operation!=="link"||req.method!=="POST")return reply(res,405,{message:"Método no permitido."});
 try{
  let body="";for await(const chunk of req){body+=chunk;if(body.length>2048)return reply(res,413,{message:"Solicitud demasiado grande."});}
  const {organizationId,phone,method}=JSON.parse(body);
  if(!/^[a-f0-9-]{36}$/.test(organizationId||"")||!/^[0-9]{8,15}$/.test(phone||"")||!["qr","pairing"].includes(method))return reply(res,400,{message:"Datos de línea inválidos."});
  const current=sessions.get(id);
  if(current){
   if(current.organizationId!==organizationId||current.phone!==phone)return reply(res,403,{message:"La línea pertenece a otra configuración."});
   return reply(res,200,snapshot(current));
  }
  if(sessions.size>=MAX_SESSIONS)return reply(res,409,{message:"Se alcanzó el máximo de sesiones del servidor de prueba."});
  const s=createSession(id,organizationId,phone,method);
  return reply(res,202,snapshot(s));
 }catch(e){console.error("request error",e);return reply(res,400,{message:"No se pudo procesar la solicitud."});}
});
server.listen(PORT,"0.0.0.0",()=>console.log("WhatsApp session worker listening on",PORT));
process.on("SIGTERM",()=>{server.close();for(const s of sessions.values())s.client?.destroy().catch(()=>{});});
