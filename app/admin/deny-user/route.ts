import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('user_type, is_approved')
      .eq('id', user.id)
      .single()

    if (!adminProfile || adminProfile.user_type !== 'admin' || !adminProfile.is_approved) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('user_type, provider_request_reason')
      .eq('id', userId)
      .single()

    const isProviderUpgrade =
      targetProfile?.user_type === 'customer' &&
      targetProfile?.provider_request_reason != null

    if (isProviderUpgrade) {
      // Restore the customer's approved status and clear the request
      const { error: restoreError } = await supabase
        .from('profiles')
        .update({ is_approved: true, provider_request_reason: null })
        .eq('id', userId)

      if (restoreError) return NextResponse.json({ error: restoreError.message }, { status: 500 })
    } else {
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    revalidatePath('/admin')

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
