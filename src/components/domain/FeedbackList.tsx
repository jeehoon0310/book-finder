'use client'

import { MessageSquare, Bug, HelpCircle, Inbox } from 'lucide-react'
import { timeAgo } from '@/lib/timeago'
import type { Database } from '@/types/database'

type Feedback = Database['public']['Tables']['feedback']['Row']

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; className: string }> = {
  suggestion: { label: '건의사항', icon: MessageSquare, className: 'bg-primary/15 text-primary border-primary/30' },
  bug: { label: '버그 신고', icon: Bug, className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  other: { label: '기타', icon: HelpCircle, className: 'bg-muted text-muted-foreground border-border/60' },
}

export function FeedbackList({ initialFeedback }: { initialFeedback: Feedback[] }) {
  if (initialFeedback.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <Inbox className="w-10 h-10" />
        <p className="text-sm">아직 등록된 의견이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {initialFeedback.map((item) => {
        const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other
        const Icon = config.icon
        return (
          <div
            key={item.id}
            className="rounded-xl border border-border/60 bg-card p-4"
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
            <p className="text-xs text-muted-foreground mt-2">{item.nickname}</p>
          </div>
        )
      })}
    </div>
  )
}
