'use client'

type ProfileFormState = {
  errors: Partial<
    Record<'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword', string[]>
  >
  message: string
  success: boolean
}

type ProfileFormProps = {
  firstName: string
  lastName: string
  email: string
  role: string
  phone?: string
  state: ProfileFormState
  pending: boolean
  formAction: (formData: FormData) => void
  ownershipMessage: string
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

export default function ProfileForm({
  firstName,
  lastName,
  email,
  role,
  phone,
  state,
  pending,
  formAction,
  ownershipMessage,
}: ProfileFormProps) {
  const messageTone = state.success
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    : 'border-red-500/40 bg-red-500/10 text-red-200'

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={(event) => {
        if (!window.confirm('Are you sure you want to save these changes?')) {
          event.preventDefault()
        }
      }}
    >
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
            name="email"
            type="email"
            defaultValue={email}
            autoComplete="email"
            required
            disabled={pending}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
          <input type="hidden" name="currentEmail" defaultValue={email} />
          <FieldErrors errors={state.errors.email} />
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

        {phone !== undefined && (
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-gray-200"
            >
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={phone}
              autoComplete="tel"
              placeholder="e.g. 050-1234567"
              disabled={pending}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500"
            />
          </div>
        )}
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
        <p className="text-sm text-cyan-100">{ownershipMessage}</p>
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
