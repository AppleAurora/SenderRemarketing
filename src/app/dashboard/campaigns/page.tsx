import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {CampaignBuilder} from "./campaign-builder";
export default async function CampaignsPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login");
 const {data:member}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!member?.organization_id) redirect("/dashboard");
 const [{data:lists},{data:lines}]=await Promise.all([
  supabase.from("contact_lists").select("id,name").eq("organization_id",member.organization_id).order("created_at",{ascending:false}),
  supabase.from("whatsapp_lines").select("id,display_name,connection_status").eq("organization_id",member.organization_id).order("created_at",{ascending:false})
 ]);
 return <CampaignBuilder lists={lists||[]} lines={lines||[]}/>;
}
