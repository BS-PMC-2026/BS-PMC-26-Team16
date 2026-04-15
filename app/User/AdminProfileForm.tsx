'use client'

import { useActionState } from 'react'
import { updateAdminProfile } from './actions'
import { initialAdminProfileState } from '@/services/adminProfile'

type AdminProfileFormProps = {
  firstName: string
  lastName: string
  email: string
  role: string
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null
  }

  return (
    <div className="mt-2 text-sm text-red-300" aria-live="polite">
      {errors.map((error) => (
        <p key={error}>{error}</p>
      ))}
    </div>
  )
}

export default function AdminProfileForm({
  firstName,
  lastName,
  email,
  role,
}: AdminProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateAdminProfile,
    initialAdminProfileState
  )

  const messageTone = state.success
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    : 'border-red-500/40 bg-red-500/10 text-red-200'

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${messageTone}`}>
          {state.message}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block text-sm font-medium text-gray-200"
          >
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            defaultValue={firstName}
            autoComplete="given-name"
            required
            minLength={2}
            disabled={pending}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
          <FieldErrors errors={state.errors.firstName} />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-2 block text-sm font-medium text-gray-200"
          >
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            defaultValue={lastName}
            autoComplete="family-name"
            required
            minLength={2}
            disabled={pending}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
          <FieldErrors errors={state.errors.lastName} />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-200"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            disabled
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-300"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-2 block text-sm font-medium text-gray-200"
          >
            Role
          </label>
          <input
            id="role"
            type="text"
            value={role}
            readOnly
            disabled
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-300"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Change password</h2>
          <p className="mt-1 text-sm text-gray-400">
            Leave these fields blank if you do not want to update your password.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-200"
            >
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
            <FieldErrors errors={state.errors.password} />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-200"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
            <FieldErrors errors={state.errors.confirmPassword} />
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-400">
          Passwords must be at least 8 characters and include uppercase,
          lowercase, a number, and a special character.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-4">
        <p className="text-sm text-cyan-100">
          Changes are applied only to your own admin account.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
