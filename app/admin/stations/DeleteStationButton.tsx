'use client'

import { useTransition } from 'react'
import { deleteProviderStation } from './actions'

export default function DeleteStationButton({ stationId }: { stationId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this station?')) return
    startTransition(async () => {
      const result = await deleteProviderStation(stationId)
      if (result.error) alert(result.error)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-600/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Removing…' : 'Remove'}
    </button>
  )
}
