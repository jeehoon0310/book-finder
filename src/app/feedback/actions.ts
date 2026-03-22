'use server'

import { supabase } from '@/lib/supabase'
import { sendTelegramMessage } from '@/lib/telegram'
import { containsBadWord } from '@/lib/bad-words'

const CATEGORY_LABELS: Record<string, string> = {
  suggestion: '건의사항',
  bug: '버그 신고',
  other: '기타',
}

export async function submitFeedback(formData: {
  nickname: string
  category: string
  content: string
}) {
  const nickname = formData.nickname.trim() || '익명'
  const content = formData.content.trim()
  const category = formData.category

  if (!content) {
    return { success: false, error: '내용을 입력해주세요.' }
  }
  if (!['suggestion', 'bug', 'other'].includes(category)) {
    return { success: false, error: '올바른 카테고리를 선택해주세요.' }
  }

  // 비속어 자동 감지
  const isHidden = containsBadWord(content) || containsBadWord(nickname)

  const { data, error } = await supabase
    .from('feedback')
    .insert({ nickname, category, content, is_hidden: isHidden })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: '등록에 실패했습니다. 다시 시도해주세요.' }
  }

  // 텔레그램 알림 (fire-and-forget)
  try {
    const baseUrl = process.env.FEEDBACK_BASE_URL || 'http://localhost:3000'
    const secret = process.env.FEEDBACK_ADMIN_SECRET
    const hideUrl = secret ? `${baseUrl}/api/feedback/hide?id=${data.id}&token=${secret}` : null

    const message = [
      isHidden ? '⚠️ 비속어 감지 — 자동 숨김 처리됨' : '📬 새 피드백이 도착했습니다!',
      '',
      `카테고리: ${CATEGORY_LABELS[category] || category}`,
      `닉네임: ${nickname}`,
      `내용: ${content}`,
      '',
      '---',
      `시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    ].join('\n')

    let finalMessage = message
    let buttons: { inline_keyboard: { text: string; url: string }[][] } | undefined

    if (hideUrl && !isHidden) {
      if (baseUrl.startsWith('https://')) {
        buttons = { inline_keyboard: [[{ text: '🚫 숨기기', url: hideUrl }]] }
      } else {
        finalMessage += `\n\n🚫 숨기기: ${hideUrl}`
      }
    }

    await sendTelegramMessage('toon', finalMessage, buttons)
  } catch (e) {
    console.error('Telegram notification failed:', e)
  }

  return { success: true }
}
