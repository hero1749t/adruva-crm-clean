
-- Schedule monthly invoice generation on the 1st of each month at 6:00 AM IST (00:30 UTC)
SELECT cron.schedule(
  'generate-monthly-invoices',
  '30 0 1 * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-invoices',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );$$
);
