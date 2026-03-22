# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MangaCafe BookFinder — a Korean manga cafe book location search system. Users search for manga by title, chosung (초성), or author, and see the physical shelf zone/number where the book is located. The UI is Korean-language, dark-mode-only.

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

**Next.js 16 App Router** with React 19, TypeScript strict mode, Tailwind CSS v4, and Supabase as the backend.

### Data Flow

- **Supabase** is the sole data source. A single shared client (`src/lib/supabase.ts`) uses public anon key via `NEXT_PUBLIC_SUPABASE_*` env vars in `.env.local`.
- **Database tables**: `books` (main), `genres`, `shelf_locations`. A Supabase RPC function `search_books` handles search with chosung support, genre/zone filtering, and pagination.
- **No API routes** — all data fetching happens either in Server Components (direct Supabase queries) or in client components (infinite scroll pagination).

### Rendering Strategy

- Homepage (`/`) and zone pages (`/zone/[name]`) use `revalidate = 60` (ISR).
- Search page (`/search`) uses `revalidate = 0` (dynamic).
- Book detail (`/book/[id]`) fetches on every request (no explicit cache).
- Server Components fetch initial data; the `InfiniteBookList` client component handles subsequent pagination client-side.

### Component Organization

- `src/components/ui/` — shadcn/ui primitives (base-nova style). Add new ones via `npx shadcn@latest add <component>`.
- `src/components/domain/` — business logic components: `BookCard`, `SearchBar`, `InfiniteBookList`, `ZoneBadge`, `LoadMore`, `BookListSkeleton`.
- `src/components/layout/` — `Header`.

### Key Patterns

- **Book type**: Always derive from `Database['public']['Tables']['books']['Row']` (defined in `src/types/database.ts`), not ad-hoc interfaces.
- **Infinite scroll**: `InfiniteBookList` accepts `fetchType: 'all' | 'search' | 'zone'` and handles pagination logic for each type. Uses intersection observer via `LoadMore`.
- **Search**: `SearchBar` is a client component using `useDebounce(300ms)` that pushes to `/search?q=...` via Next.js router. The search page's server component calls the `search_books` RPC.
- **Path alias**: `@/*` maps to `./src/*`.

### Styling

- Tailwind CSS v4 with CSS variables for theming (defined in `src/globals.css`).
- Font: Pretendard (loaded via CDN in layout).
- Dark mode only (`<html lang="ko" className="dark">`).
- shadcn/ui config in `components.json` (base-nova style, neutral base color).

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```
