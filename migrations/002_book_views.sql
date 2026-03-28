-- 고객 인기작: 도서 상세 페이지 조회 기록 테이블
CREATE TABLE IF NOT EXISTS book_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_book_views_created_at ON book_views(created_at DESC);
CREATE INDEX idx_book_views_book_id ON book_views(book_id);

ALTER TABLE book_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON book_views
  FOR ALL USING (auth.role() = 'service_role');

-- 집계용 RPC 함수: 기간 내 고유 방문자 기준 인기 도서
CREATE OR REPLACE FUNCTION get_customer_popular_books(
  since_date TIMESTAMPTZ,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE(book_id UUID, view_count BIGINT) AS $$
  SELECT book_id, COUNT(DISTINCT ip_hash) as view_count
  FROM book_views
  WHERE created_at >= since_date
    AND ip_hash IS NOT NULL
  GROUP BY book_id
  ORDER BY view_count DESC
  LIMIT max_results;
$$ LANGUAGE sql STABLE;

-- books 테이블에 고객 인기 순위 컬럼 추가
ALTER TABLE books ADD COLUMN IF NOT EXISTS customer_popular_rank INTEGER;
