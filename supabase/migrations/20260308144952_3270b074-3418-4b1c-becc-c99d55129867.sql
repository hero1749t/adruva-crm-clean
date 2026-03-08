
-- Add task_manager to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'task_manager';
