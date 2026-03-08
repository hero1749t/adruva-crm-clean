
-- Database function to fire automations via edge function
CREATE OR REPLACE FUNCTION public.fire_automation_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  trigger_evt text;
  entity_data jsonb;
  old_entity_data jsonb;
  entity_type text;
  supabase_url text;
  anon_key text;
BEGIN
  -- Determine trigger event and entity type
  IF TG_TABLE_NAME = 'leads' THEN
    entity_type := 'lead';
    IF TG_OP = 'INSERT' THEN
      trigger_evt := 'lead_created';
    ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
      trigger_evt := 'lead_status_changed';
    ELSE
      RETURN NEW;
    END IF;
    entity_data := jsonb_build_object(
      '_entity_type', 'lead',
      'name', NEW.name,
      'email', NEW.email,
      'phone', NEW.phone,
      'status', NEW.status,
      'source', NEW.source,
      'assigned_to', NEW.assigned_to,
      'company_name', NEW.company_name
    );
    IF TG_OP = 'UPDATE' THEN
      old_entity_data := jsonb_build_object('status', OLD.status);
    END IF;
  ELSIF TG_TABLE_NAME = 'clients' THEN
    entity_type := 'client';
    IF TG_OP = 'INSERT' THEN
      trigger_evt := 'client_created';
    ELSE
      RETURN NEW;
    END IF;
    entity_data := jsonb_build_object(
      '_entity_type', 'client',
      'client_name', NEW.client_name,
      'email', NEW.email,
      'assigned_manager', NEW.assigned_manager,
      'status', NEW.status
    );
  ELSE
    RETURN NEW;
  END IF;

  -- Check if any active rules exist for this trigger
  IF EXISTS (
    SELECT 1 FROM public.automation_rules
    WHERE trigger_event = trigger_evt AND is_active = true
  ) THEN
    -- Fire edge function asynchronously via pg_net
    SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
    SELECT current_setting('app.settings.anon_key', true) INTO anon_key;
    
    -- Use net.http_post if available, otherwise just log
    BEGIN
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/execute-automation',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        ),
        body := jsonb_build_object(
          'trigger_event', trigger_evt,
          'entity_id', NEW.id,
          'entity_data', entity_data,
          'old_data', COALESCE(old_entity_data, '{}'::jsonb)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Silently fail if pg_net is not available
      RAISE WARNING 'Automation trigger failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create triggers on leads table
CREATE TRIGGER trg_leads_automation_insert
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.fire_automation_trigger();

CREATE TRIGGER trg_leads_automation_update
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.fire_automation_trigger();

-- Create trigger on clients table
CREATE TRIGGER trg_clients_automation_insert
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.fire_automation_trigger();
