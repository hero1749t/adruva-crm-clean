-- Allow owners and admins to insert notifications for any user
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid()) OR
    (public.get_user_role(auth.uid()) IN ('owner', 'admin'))
  );