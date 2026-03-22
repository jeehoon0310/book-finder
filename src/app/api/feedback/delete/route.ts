import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  const token = searchParams.get('token')

  if (!id || !token) {
    return new NextResponse('잘못된 요청입니다.', { status: 400 })
  }

  if (token !== process.env.FEEDBACK_ADMIN_SECRET) {
    return new NextResponse('권한이 없습니다.', { status: 403 })
  }

  const { error } = await supabase
    .from('feedback')
    .delete()
    .eq('id', id)

  if (error) {
    return new NextResponse('삭제에 실패했습니다.', { status: 500 })
  }

  revalidatePath('/feedback')

  return new NextResponse(
    '<html><body style="background:#0a0a0a;color:#fafafa;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><p style="font-size:2em">🗑️</p><p>해당 의견이 삭제되었습니다.</p></div></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}
