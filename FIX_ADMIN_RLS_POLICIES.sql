-- FIX_ADMIN_RLS_POLICIES.sql
-- Fix RLS policies so admins can view ALL transcript and recommendation requests
-- Run in Supabase SQL editor

-- 1) Fix transcript_requests policies

-- Drop existing admin policy
DROP POLICY IF EXISTS "transcript_admin_all" ON public.transcript_requests;

-- Create new admin select policy (for viewing all requests)
CREATE POLICY "transcript_admin_select_all" ON public.transcript_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

-- Create new admin update policy (for updating all requests)
CREATE POLICY "transcript_admin_update_all" ON public.transcript_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

-- 2) Fix recommendation_requests policies

-- Drop existing admin policy if any
DROP POLICY IF EXISTS "recommendation_admin_all" ON public.recommendation_requests;

-- Create new admin select policy (for viewing all requests)
CREATE POLICY "recommendation_admin_select_all" ON public.recommendation_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

-- Create new admin update policy (for updating all requests)
CREATE POLICY "recommendation_admin_update_all" ON public.recommendation_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

-- End of migration
