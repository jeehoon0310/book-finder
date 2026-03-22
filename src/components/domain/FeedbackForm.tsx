'use client'

import { useState } from 'react'
import { Send, CheckCircle, MessageSquare, Bug, HelpCircle } from 'lucide-react'
import { submitFeedback } from '@/app/feedback/actions'

const CATEGORIES = [
  { value: 'suggestion', label: '건의사항', icon: MessageSquare },
  { value: 'bug', label: '버그 신고', icon: Bug },
  { value: 'other', label: '기타', icon: HelpCircle },
] as const

export function FeedbackForm() {
  const [nickname, setNickname] = useState('')
  const [category, setCategory] = useState('suggestion')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    setError(null)
    setIsSubmitting(true)
    const result = await submitFeedback({ nickname, category, content, password })
    setIsSubmitting(false)

    if (result.success) {
      setIsSubmitted(true)
    } else {
      setError(result.error || '등록에 실패했습니다.')
    }
  }

  const handleReset = () => {
    setIsSubmitted(false)
    setNickname('')
    setCategory('suggestion')
    setContent('')
    setPassword('')
    setError(null)
  }

  if (isSubmitted) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="font-semibold">의견이 등록되었습니다!</p>
          <p className="text-sm text-muted-foreground text-center">
            소중한 의견 감사합니다. 더 나은 서비스를 위해 노력하겠습니다.
          </p>
          <button
            onClick={handleReset}
            className="mt-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            다른 의견 작성하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <h2 className="text-base font-semibold mb-1">의견 남기기</h2>
      <p className="text-sm text-muted-foreground mb-5">
        만화카페 이용에 대한 의견을 자유롭게 남겨주세요.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            닉네임 <span className="text-muted-foreground font-normal">(선택)</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="익명"
            maxLength={20}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/60"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">카테고리</label>
          <div className="flex gap-2">
            {CATEGORIES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                  category === value
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-border/60 text-muted-foreground hover:border-primary/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="의견을 입력해주세요"
            rows={4}
            required
            maxLength={1000}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/60 resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            비밀번호 <span className="text-muted-foreground font-normal">(선택)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="4자리 이상"
            maxLength={20}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/60"
          />
          {!password.trim() && (
            <p className="text-xs text-yellow-500 mt-1.5">
              비밀번호를 설정하지 않으면 누구나 수정/삭제할 수 있습니다.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? '등록 중...' : '의견 등록하기'}
        </button>
      </form>
    </div>
  )
}
