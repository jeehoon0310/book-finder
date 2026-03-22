'use client'

import { useState } from 'react'
import { MessageSquare, Bug, HelpCircle, Inbox, Pencil, Trash2, X } from 'lucide-react'
import { timeAgo } from '@/lib/timeago'
import { deleteFeedback, editFeedback } from '@/app/feedback/actions'

type FeedbackItem = {
  id: string
  nickname: string
  category: string
  content: string
  is_hidden: boolean
  created_at: string
  has_password: boolean
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; className: string }> = {
  suggestion: { label: '건의사항', icon: MessageSquare, className: 'bg-primary/15 text-primary border-primary/30' },
  bug: { label: '버그 신고', icon: Bug, className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  other: { label: '기타', icon: HelpCircle, className: 'bg-muted text-muted-foreground border-border/60' },
}

type ModalState =
  | { type: 'none' }
  | { type: 'delete'; id: string; hasPassword: boolean }
  | { type: 'edit'; id: string; content: string; hasPassword: boolean }

function ActionModal({
  state,
  onClose,
  onConfirm,
}: {
  state: Exclude<ModalState, { type: 'none' }>
  onClose: () => void
  onConfirm: (password: string, newContent?: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [password, setPassword] = useState('')
  const [newContent, setNewContent] = useState(state.type === 'edit' ? state.content : '')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state.hasPassword && !password.trim()) return
    setError(null)
    setIsLoading(true)
    const result = await onConfirm(password, state.type === 'edit' ? newContent : undefined)
    setIsLoading(false)
    if (result.success) {
      onClose()
    } else {
      setError(result.error || '처리에 실패했습니다.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-sm mx-4 rounded-xl border border-border/60 bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            {state.type === 'delete' ? '의견 삭제' : '의견 수정'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {state.type === 'edit' && (
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              autoFocus={!state.hasPassword}
            />
          )}

          {state.hasPassword ? (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/60"
              autoFocus
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {state.type === 'delete'
                ? '이 의견을 삭제하시겠습니까?'
                : '수정 내용을 저장하시겠습니까?'}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm border border-border/60 hover:bg-muted/50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={(state.hasPassword && !password.trim()) || isLoading}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                state.type === 'delete'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isLoading ? '처리 중...' : state.type === 'delete' ? '삭제' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function FeedbackList({ initialFeedback }: { initialFeedback: FeedbackItem[] }) {
  const [feedback, setFeedback] = useState(initialFeedback)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })

  if (feedback.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <Inbox className="w-10 h-10" />
        <p className="text-sm">아직 등록된 의견이 없습니다.</p>
      </div>
    )
  }

  const handleConfirm = async (password: string, newContent?: string) => {
    if (modal.type === 'none') return { success: false }

    if (modal.type === 'delete') {
      const result = await deleteFeedback(modal.id, password)
      if (result.success) {
        setFeedback((prev) => prev.filter((item) => item.id !== modal.id))
      }
      return result
    }

    if (modal.type === 'edit' && newContent !== undefined) {
      const result = await editFeedback(modal.id, password, newContent)
      if (result.success) {
        setFeedback((prev) =>
          prev.map((item) => (item.id === modal.id ? { ...item, content: newContent.trim() } : item))
        )
      }
      return result
    }

    return { success: false }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {feedback.map((item) => {
          const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other
          const Icon = config.icon
          return (
            <div
              key={item.id}
              className="group rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${config.className}`}>
                  <Icon className="w-3 h-3" />
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {timeAgo(item.created_at)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>
              <div className="flex items-center mt-2">
                <p className="text-xs text-muted-foreground">{item.nickname}</p>
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={() => setModal({ type: 'edit', id: item.id, content: item.content, hasPassword: item.has_password })}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title="수정"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setModal({ type: 'delete', id: item.id, hasPassword: item.has_password })}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal.type !== 'none' && (
        <ActionModal
          state={modal}
          onClose={() => setModal({ type: 'none' })}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}
