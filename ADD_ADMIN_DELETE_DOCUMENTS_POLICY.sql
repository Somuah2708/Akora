-- Add policy to allow admins to delete any document
-- This extends the existing delete policy to allow admins to delete documents uploaded by any user

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can delete own documents" ON public.secretariat_documents;

-- Create a new policy that allows users to delete their own documents OR admins to delete any document
CREATE POLICY "Users can delete own documents or admins can delete any"
  ON public.secretariat_documents
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );

-- Also update the update policy to allow admins to edit any document
DROP POLICY IF EXISTS "Users can update own documents" ON public.secretariat_documents;

CREATE POLICY "Users can update own documents or admins can update any"
  ON public.secretariat_documents
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );

-- Comment for documentation
COMMENT ON POLICY "Users can delete own documents or admins can delete any" 
  ON public.secretariat_documents IS 
  'Allows users to delete their own documents and admins to delete any document';

COMMENT ON POLICY "Users can update own documents or admins can update any" 
  ON public.secretariat_documents IS 
  'Allows users to update their own documents and admins to update any document';
