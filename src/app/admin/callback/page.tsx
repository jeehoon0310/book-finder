'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const next = searchParams.get('next') || '/admin/analytics'

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'implicit' } }
    )

    // Implicit flow: tokens are in the URL hash fragment
    // Supabase client auto-detects and sets session from hash
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Session is set — now sync to cookies by calling getUser via server
        fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        }).then(() => {
          router.replace(next)
        })
      }
    })

    // If no hash tokens, check if already signed in
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) {
      // No tokens in hash — maybe direct navigation
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.replace(next)
        } else {
          setErrorMsg('로그인 정보를 찾을 수 없습니다.')
        }
      })
    }
  }, [router, searchParams])

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive font-medium">로그인에 실패했습니다.</p>
        <p className="text-xs text-muted-foreground">{errorMsg}</p>
        <a href="/admin/login" className="text-sm text-primary hover:underline">
          다시 시도하기
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        로그인 처리 중...
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
