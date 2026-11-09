import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {CampaignBuilder} from "./campaign-builder";
import {CampaignManager} from "./campaign-manager";
export default async function CampaignsPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login");
 const {data:member}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!member?.organization_id) redirect("/dashboard");
 const [{data:lists},{data:lines},{data:campaigns}]=await Promise.all([
  supabase.from("contact_lists").select("id,name").eq("organization_id",member.organization_id).order("created_at",{ascending:false}),
  supabase.from("whatsapp_lines").select("id,display_name,connection_status").eq("organization_id",member.organization_id).order("created_at",{ascending:false}),
  supabase.from("campaigns").select("id,name,status,scheduled_at,created_at").eq("organization_id",member.organization_id).order("created_at",{ascending:false}).limit(100)
 ]);
 return <><CampaignBuilder lists={lists||[]} lines={lines||[]}/><div className="mx-auto max-w-4xl px-5 pb-10 sm:px-8"><CampaignManager campaigns={campaigns||[]}/></div></>;
}
