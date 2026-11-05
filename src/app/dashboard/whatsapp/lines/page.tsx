import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {LinesWorkspace} from "./lines-workspace";
export default async function PersonalLinesPage(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:membership}=await db.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!membership)redirect("/dashboard");
 const {data}=await db.from("whatsapp_lines").select("id,display_name,phone_e164,connection_status,provider").eq("organization_id",membership.organization_id).eq("account_type","personal").order("created_at",{ascending:false});
 return <LinesWorkspace lines={data||[]}/>;
}
