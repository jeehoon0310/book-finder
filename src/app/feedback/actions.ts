'use server'

import { createHash } from 'crypto'
import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { sendTelegramMessage } from '@/lib/telegram'
import { containsBadWord } from '@/lib/bad-words'

const CATEGORY_LABELS: Record<string, string> = {
  suggestion: '건의사항',
  bug: '버그 신고',
  other: '기타',
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function submitFeedback(formData: {
  nickname: string
  category: string
  content: string
  password: string
}) {
  const nickname = formData.nickname.trim() || '익명'
  const content = formData.content.trim()
  const category = formData.category
  const password = formData.password.trim()

  if (!content) {
    return { success: false, error: '내용을 입력해주세요.' }
  }
  if (password && password.length < 4) {
    return { success: false, error: '비밀번호는 4자리 이상 입력해주세요.' }
  }
  if (!['suggestion', 'bug', 'other'].includes(category)) {
    return { success: false, error: '올바른 카테고리를 선택해주세요.' }
  }

  // 비속어 자동 감지
  const isHidden = containsBadWord(content) || containsBadWord(nickname)

  const { data, error } = await supabase
    .from('feedback')
    .insert({ nickname, category, content, is_hidden: isHidden, password_hash: password ? hashPassword(password) : null })
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
    const deleteUrl = secret ? `${baseUrl}/api/feedback/delete?id=${data.id}&token=${secret}` : null

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

    if (secret && !isHidden && baseUrl.startsWith('https://')) {
      const row: { text: string; url: string }[] = []
      if (hideUrl) row.push({ text: '🚫 숨기기', url: hideUrl })
      if (deleteUrl) row.push({ text: '🗑️ 삭제', url: deleteUrl })
      if (row.length > 0) buttons = { inline_keyboard: [row] }
    } else if (hideUrl && !isHidden) {
      finalMessage += `\n\n🚫 숨기기: ${hideUrl}`
      if (deleteUrl) finalMessage += `\n🗑️ 삭제: ${deleteUrl}`
    }

    await sendTelegramMessage('toon', finalMessage, buttons)
  } catch (e) {
    console.error('Telegram notification failed:', e)
  }

  revalidatePath('/feedback')
  return { success: true }
}

export async function deleteFeedback(id: string, password: string) {
  if (!id) {
    return { success: false, error: '잘못된 요청입니다.' }
  }

  const { data } = await supabase
    .from('feedback')
    .select('password_hash')
    .eq('id', id)
    .single()

  if (!data) {
    return { success: false, error: '의견을 찾을 수 없습니다.' }
  }

  if (data.password_hash && data.password_hash !== hashPassword(password)) {
    return { success: false, error: '비밀번호가 일치하지 않습니다.' }
  }

  const { error } = await supabase.from('feedback').delete().eq('id', id)
  if (error) {
    return { success: false, error: '삭제에 실패했습니다.' }
  }

  revalidatePath('/feedback')
  return { success: true }
}

export async function editFeedback(id: string, password: string, newContent: string) {
  if (!id || !newContent.trim()) {
    return { success: false, error: '잘못된 요청입니다.' }
  }

  if (containsBadWord(newContent)) {
    return { success: false, error: '부적절한 내용이 포함되어 있습니다.' }
  }

  const { data } = await supabase
    .from('feedback')
    .select('password_hash')
    .eq('id', id)
    .single()

  if (!data) {
    return { success: false, error: '의견을 찾을 수 없습니다.' }
  }

  if (data.password_hash && data.password_hash !== hashPassword(password)) {
    return { success: false, error: '비밀번호가 일치하지 않습니다.' }
  }

  const { error } = await supabase
    .from('feedback')
    .update({ content: newContent.trim() })
    .eq('id', id)

  if (error) {
    return { success: false, error: '수정에 실패했습니다.' }
  }

  revalidatePath('/feedback')
  return { success: true }
}
