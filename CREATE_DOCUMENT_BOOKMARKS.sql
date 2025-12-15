-- Document Bookmarks Table
-- This table stores user bookmarks/favorites for secretariat documents

CREATE TABLE IF NOT EXISTS document_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES secretariat_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure a user can only bookmark a document once
  UNIQUE(user_id, document_id)
);

-- Enable RLS
ALTER TABLE document_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON document_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON document_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON document_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_bookmarks_user_id ON document_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_bookmarks_document_id ON document_bookmarks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_bookmarks_created_at ON document_bookmarks(created_at DESC);

-- Comment
COMMENT ON TABLE document_bookmarks IS 'Stores user bookmarks/favorites for secretariat documents';
