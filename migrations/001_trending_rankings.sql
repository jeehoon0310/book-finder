-- Migration: Add trending rankings support
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/sryqiljtqfplyzebnlgh/sql

-- 1. Create trending_rankings table
CREATE TABLE IF NOT EXISTS trending_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'aladin',
  external_title TEXT NOT NULL,
  external_author TEXT,
  external_rank INTEGER NOT NULL,
  external_cover_url TEXT,
  isbn13 TEXT,
  matched_book_id UUID REFERENCES books(id),
  match_score REAL,
  fetched_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_trending_fetched_date ON trending_rankings(fetched_date DESC);
CREATE INDEX IF NOT EXISTS idx_trending_matched_book ON trending_rankings(matched_book_id) WHERE matched_book_id IS NOT NULL;

-- 3. Add trending_rank column to books
ALTER TABLE books ADD COLUMN IF NOT EXISTS trending_rank INTEGER;

-- 4. Enable RLS but allow service role full access
ALTER TABLE trending_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON trending_rankings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can read" ON trending_rankings
  FOR SELECT USING (true);
