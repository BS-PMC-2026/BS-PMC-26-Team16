import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Delete from profiles first to avoid FK constraint issues
    await supabase.from('profiles').delete().eq('id', userId)

    // Delete the auth user (requires service role key in SUPABASE_SERVICE_ROLE_KEY)
    const adminClient = createAdminClient()
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
