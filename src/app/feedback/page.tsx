import { supabase } from '@/lib/supabase'
import { FeedbackForm } from '@/components/domain/FeedbackForm'
import { FeedbackList } from '@/components/domain/FeedbackList'

export const revalidate = 0

export default async function FeedbackPage() {
  const { data: feedback } = await supabase
    .from('feedback')
    .select('*')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-8 max-w-2xl">
      <section>
        <h1 className="text-2xl font-bold mb-1">의견함</h1>
        <p className="text-sm text-muted-foreground">
          만화카페 이용에 대한 건의사항이나 의견을 남겨주세요.
        </p>
      </section>

      <FeedbackForm />

      <section>
        <h2 className="text-lg font-semibold mb-4">등록된 의견</h2>
        <FeedbackList initialFeedback={feedback || []} />
      </section>
    </div>
  )
}
