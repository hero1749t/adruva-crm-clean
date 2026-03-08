
-- Fix: restrict automation_logs insert to owners and admins only
DROP POLICY "System can insert automation logs" ON public.automation_logs;
CREATE POLICY "Owners and admins can insert automation logs"
  ON public.automation_logs FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = ANY(ARRAY['owner'::user_role, 'admin'::user_role]));
