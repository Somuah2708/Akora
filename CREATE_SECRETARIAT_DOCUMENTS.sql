-- Create secretariat_documents table
-- This table stores all documents for the OAA Secretariat Document Center
-- Supports multiple document types with metadata and access control

CREATE TABLE IF NOT EXISTS public.secretariat_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Document Information
  title TEXT NOT NULL,
  description TEXT,
  
  -- Categorization
  category TEXT NOT NULL, -- Forms, Reports, Policies, Minutes, Financial, Academic, Legal, etc.
  document_type TEXT, -- PDF, DOC, DOCX, XLS, XLSX, etc.
  
  -- File Information
  file_url TEXT NOT NULL, -- Supabase storage URL or external URL
  file_name TEXT NOT NULL,
  file_size BIGINT, -- Size in bytes
  
  -- Uploader Information
  uploader_name TEXT,
  uploader_email TEXT,
  uploader_title TEXT,
  
  -- Access Control
  is_public BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  tags JSONB, -- Array of tags for better organization
  version TEXT DEFAULT '1.0',
  language TEXT DEFAULT 'en',
  
  -- Engagement
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  -- Timestamps
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_category CHECK (category IN (
    'Forms', 'Reports', 'Policies', 'Minutes', 
    'Financial', 'Academic', 'Legal', 'Newsletters',
    'Guidelines', 'Templates', 'Other'
  ))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_secretariat_documents_user_id ON public.secretariat_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_secretariat_documents_category ON public.secretariat_documents(category);
CREATE INDEX IF NOT EXISTS idx_secretariat_documents_upload_date ON public.secretariat_documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_secretariat_documents_is_public ON public.secretariat_documents(is_public);
CREATE INDEX IF NOT EXISTS idx_secretariat_documents_is_approved ON public.secretariat_documents(is_approved);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_secretariat_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_secretariat_documents_updated_at
  BEFORE UPDATE ON public.secretariat_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_secretariat_documents_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.secretariat_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view public and approved documents or their own
CREATE POLICY "Users can view public documents or own"
  ON public.secretariat_documents
  FOR SELECT
  USING (
    (is_public = true AND is_approved = true)
    OR 
    auth.uid() = user_id
  );

-- Policy: Authenticated users can upload documents
CREATE POLICY "Users can upload documents"
  ON public.secretariat_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
  ON public.secretariat_documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
  ON public.secretariat_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create document_downloads table for tracking
CREATE TABLE IF NOT EXISTS public.document_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.secretariat_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT
);

-- Index for document downloads
CREATE INDEX IF NOT EXISTS idx_document_downloads_document_id ON public.document_downloads(document_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_user_id ON public.document_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_downloaded_at ON public.document_downloads(downloaded_at DESC);

-- Enable RLS for document downloads
ALTER TABLE public.document_downloads ENABLE ROW LEVEL SECURITY;

-- Download tracking policies
CREATE POLICY "Users can create download records"
  ON public.document_downloads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own downloads"
  ON public.document_downloads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create document_views table for tracking
CREATE TABLE IF NOT EXISTS public.document_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.secretariat_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Track unique views per user per document
  UNIQUE(document_id, user_id)
);

-- Index for document views
CREATE INDEX IF NOT EXISTS idx_document_views_document_id ON public.document_views(document_id);
CREATE INDEX IF NOT EXISTS idx_document_views_user_id ON public.document_views(user_id);
CREATE INDEX IF NOT EXISTS idx_document_views_viewed_at ON public.document_views(viewed_at DESC);

-- Enable RLS for document views
ALTER TABLE public.document_views ENABLE ROW LEVEL SECURITY;

-- View tracking policies
CREATE POLICY "Users can create view records"
  ON public.document_views
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own views"
  ON public.document_views
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_document_download_count(document_uuid UUID, downloader_user_id UUID, downloader_ip TEXT)
RETURNS void AS $$
BEGIN
  -- Insert download record
  INSERT INTO public.document_downloads (document_id, user_id, ip_address)
  VALUES (document_uuid, downloader_user_id, downloader_ip);
  
  -- Update download count
  UPDATE public.secretariat_documents
  SET download_count = download_count + 1
  WHERE id = document_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_document_view_count(document_uuid UUID, viewer_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert view record (will fail silently if already viewed by this user)
  INSERT INTO public.document_views (document_id, user_id)
  VALUES (document_uuid, viewer_user_id)
  ON CONFLICT (document_id, user_id) DO NOTHING;
  
  -- Update view count
  UPDATE public.secretariat_documents
  SET view_count = (
    SELECT COUNT(DISTINCT user_id) 
    FROM public.document_views 
    WHERE document_id = document_uuid
  )
  WHERE id = document_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats(document_uuid UUID)
RETURNS TABLE(
  total_views INTEGER,
  total_downloads INTEGER,
  unique_viewers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(d.view_count, 0) as total_views,
    COALESCE(d.download_count, 0) as total_downloads,
    COALESCE(COUNT(DISTINCT v.user_id), 0)::INTEGER as unique_viewers
  FROM public.secretariat_documents d
  LEFT JOIN public.document_views v ON v.document_id = d.id
  WHERE d.id = document_uuid
  GROUP BY d.id, d.view_count, d.download_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.secretariat_documents IS 'Stores all documents for the OAA Secretariat Document Center';
COMMENT ON TABLE public.document_downloads IS 'Tracks document downloads';
COMMENT ON TABLE public.document_views IS 'Tracks unique document views per user';
COMMENT ON COLUMN public.secretariat_documents.category IS 'Document category: Forms, Reports, Policies, Minutes, Financial, Academic, Legal, Newsletters, Guidelines, Templates, Other';
COMMENT ON COLUMN public.secretariat_documents.is_public IS 'Whether document is visible to all users';
COMMENT ON COLUMN public.secretariat_documents.file_size IS 'File size in bytes';
