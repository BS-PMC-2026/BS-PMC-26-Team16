import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminProfileForm from './AdminProfileForm'
import CustomerProfileForm from './CustomerProfileForm'
import ProviderProfileForm from './ProviderProfileForm'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, user_type, is_approved')
    .eq('id', user.id)
    .single()

  if (
    error ||
    !profile ||
    !['admin', 'customer', 'provider'].includes(profile.user_type)
  ) {
    redirect('/')
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim()
  const isAdmin = profile.user_type === 'admin'
  const isCustomer = profile.user_type === 'customer'
  const profileTitle = isAdmin
    ? 'Admin Profile'
    : isCustomer
      ? 'Customer Profile'
      : 'Provider Profile'
  const profileHeading = isAdmin
    ? 'Manage your account details'
    : isCustomer
      ? 'Keep your customer profile up to date'
      : 'Keep your provider profile up to date'
  const profileDescription = isAdmin
    ? 'Review your personal information, update your name, and change your password securely from one place.'
    : isCustomer
      ? 'Review your personal information, update your name, and keep your customer login secure from one place.'
      : 'Review your personal information, update your name, and keep your provider login secure from one place.'
  const roleLabel = isAdmin
    ? 'Administrator'
    : isCustomer
      ? 'Customer'
      : 'Service Provider'
  const isApproved = profile.is_approved === true
  const statusLabel = isApproved ? 'Approved' : 'Pending approval'
  const statusClasses = isApproved
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-200'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#155e75_0%,#020617_35%,#000000_100%)] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
        <div className="mb-10">
          <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-100">
            {profileTitle}
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight">
            {profileHeading}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-gray-300">
            {profileDescription}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">
              Overview
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-gray-400">Name</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {fullName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="mt-1 text-base text-gray-200">
                  {profile.email ?? user.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Role</p>
                <p className="mt-1 text-base font-medium text-cyan-100">
                  {roleLabel}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${statusClasses}`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
            {isAdmin ? (
              <AdminProfileForm
                firstName={profile.first_name ?? ''}
                lastName={profile.last_name ?? ''}
                email={profile.email ?? user.email ?? ''}
                role={roleLabel}
              />
            ) : isCustomer ? (
              <CustomerProfileForm
                firstName={profile.first_name ?? ''}
                lastName={profile.last_name ?? ''}
                email={profile.email ?? user.email ?? ''}
                role={roleLabel}
              />
            ) : (
              <ProviderProfileForm
                firstName={profile.first_name ?? ''}
                lastName={profile.last_name ?? ''}
                email={profile.email ?? user.email ?? ''}
                role={roleLabel}
              />
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
