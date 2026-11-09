-- Run after schema.sql and batch_scheduler.sql.
-- User-controlled campaign lifecycle, independent of the delivery worker.
create or replace function public.set_campaign_state(p_campaign uuid,p_action text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_current text; v_next text; v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select organization_id,status into v_org,v_current from public.campaigns where id=p_campaign for update;
 if v_org is null or not public.is_org_member(v_org) then raise exception 'Campaign not found'; end if;
 if p_action='start' and v_current in ('draft','scheduled') then v_next:='running';
 elsif p_action='pause' and v_current='running' then v_next:='paused';
 elsif p_action='resume' and v_current='paused' then v_next:='running';
 elsif p_action='cancel' and v_current in ('draft','scheduled','running','paused') then v_next:='cancelled';
 else raise exception 'Invalid campaign state transition'; end if;
 update public.campaigns set status=v_next,updated_at=now() where id=p_campaign;
 if v_next='cancelled' then
  update public.scheduled_messages set status='cancelled'
   where campaign_id=p_campaign and organization_id=v_org and status='pending';
  get diagnostics v_count=row_count;
 else v_count:=0; end if;
 return jsonb_build_object('status',v_next,'cancelled_pending',v_count);
end; $$;
revoke all on function public.set_campaign_state(uuid,text) from public,anon;
grant execute on function public.set_campaign_state(uuid,text) to authenticated;
