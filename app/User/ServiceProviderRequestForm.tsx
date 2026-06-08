'use client'

import { useActionState } from 'react'
import { requestProviderStatus } from './actions'

type Props = {
  providerRequestPending: boolean
}

const initialState = { message: '', success: false }

export default function ServiceProviderRequestForm({ providerRequestPending }: Props) {
  const [state, formAction, pending] = useActionState(requestProviderStatus, initialState)

  if (providerRequestPending) {
    return (
      <div className="mt-8 rounded-[2rem] border border-cyan-500/30 bg-cyan-500/10 p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <p className="text-base font-semibold text-cyan-200">Request under review</p>
        </div>
        <p className="text-sm text-cyan-300/70">
          Your service provider request has been submitted and is pending admin review. You will gain access to add charging stations once approved.
        </p>
      </div>
    )
  }

  const messageTone = state.success
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    : 'border-red-500/40 bg-red-500/10 text-red-200'

  return (
    <section className="mt-8 rounded-[2rem] border border-cyan-500/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">Become a Service Provider</h2>
        <p className="mt-1 text-sm text-gray-400">
          Submit a request to register as a service provider. Once approved, you will be able to add your charging station to the map.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {state.message && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${messageTone}`}>
            {state.message}
          </div>
        )}

        <div>
          <label htmlFor="providerReason" className="mb-2 block text-sm font-medium text-gray-200">
            Why do you want to become a service provider?
          </label>
          <textarea
            id="providerReason"
            name="reason"
            rows={4}
            required
            disabled={pending}
            placeholder="Describe your setup, location, and why you'd like to offer charging to other EV drivers..."
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400 placeholder:text-gray-500 resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </section>
  )
}
