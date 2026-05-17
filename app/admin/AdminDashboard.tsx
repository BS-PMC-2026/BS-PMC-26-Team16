'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveProviderStation, deleteProviderStation } from '@/app/admin/stations/actions'
import AdminProfileForm from '@/app/User/AdminProfileForm'
import StationMiniMap from '@/app/admin/StationMiniMap'
import { createClient } from '@/lib/supabase/client'

export type PendingUser = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  id_number: string | null
  user_type: string
  request_reason: string | null
  created_at: string
}

export type StationWithOwner = {
  id: string
  userId?: string
  address: string
  station_type: string
  lat: number
  lng: number
  ownerName: string
  ownerPhone: string
  access_type: 'PRIVATE' | 'PUBLIC'
  chargerCount?: number
  fastCount?: number
  slowCount?: number
}

type Tab = 'users' | 'stations'
type UserAction = 'accept' | 'deny' | null
type StationAction = 'approve' | 'remove' | null

type Props = {
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  pendingUsers: PendingUser[]
  stations: StationWithOwner[]
  totalActiveUsers: number
  totalMapStations: number
}

export default function AdminDashboard({ adminFirstName, adminLastName, adminEmail, pendingUsers, stations, totalActiveUsers, totalMapStations }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')
  const [localUsers, setLocalUsers] = useState(pendingUsers)
  const [localStations, setLocalStations] = useState(stations)
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(pendingUsers[0] ?? null)
  const [selectedStation, setSelectedStation] = useState<StationWithOwner | null>(stations[0] ?? null)
  const [userAction, setUserAction] = useState<UserAction>(null)
  const [stationAction, setStationAction] = useState<StationAction>(null)
  const [responseText, setResponseText] = useState('')
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [stationTypeFilter, setStationTypeFilter] = useState<Set<string>>(new Set(['FAST', 'SLOW']))
  const [accessFilter, setAccessFilter] = useState<Set<string>>(new Set(['PRIVATE', 'PUBLIC']))

  function toggleStationType(type: string) {
    setStationTypeFilter(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function toggleAccessType(type: string) {
    setAccessFilter(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const sortedUsers = [...localUsers].sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return sortOrder === 'newest' ? diff : -diff
  })
  const sortedStations = sortOrder === 'newest' ? localStations : [...localStations].reverse()
  const filteredSortedStations = sortedStations.filter(s =>
    stationTypeFilter.has(s.station_type) && accessFilter.has(s.access_type)
  )

  function switchTab(t: Tab) {
    setTab(t)
    setFeedback(null)
    setUserAction(null)
    setStationAction(null)
  }

  function selectUser(u: PendingUser) {
    setSelectedUser(u)
    setUserAction(null)
    setResponseText('')
    setFeedback(null)
  }

  function selectStation(s: StationWithOwner) {
    setSelectedStation(s)
    setStationAction(null)
    setFeedback(null)
  }

  function handleSend() {
    startTransition(async () => {
      if (tab === 'users' && selectedUser && userAction) {
        const endpoint = userAction === 'accept' ? '/admin/approve-user' : '/admin/deny-user'
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUser.id }),
        })
        const data = await res.json()
        if (res.ok) {
          setFeedback({ msg: userAction === 'accept' ? 'User approved.' : 'User denied.', ok: true })
          setLocalUsers(prev => {
            const next = prev.filter(u => u.id !== selectedUser.id)
            setSelectedUser(next[0] ?? null)
            return next
          })
          setUserAction(null)
          setResponseText('')
          router.refresh()
        } else {
          setFeedback({ msg: data.error || 'Something went wrong.', ok: false })
        }
      }

      if (tab === 'stations' && selectedStation && stationAction === 'keep') {
        const result = await approveProviderStation(selectedStation.id)
        if (result.error) {
          setFeedback({ msg: result.error, ok: false })
        } else {
          setFeedback({ msg: 'Station approved.', ok: true })
          setLocalStations(prev => {
            const next = prev.filter(s => s.id !== selectedStation.id)
            setSelectedStation(next[0] ?? null)
            return next
          })
          setStationAction(null)
          router.refresh()
        }
      }

      if (tab === 'stations' && selectedStation && stationAction === 'remove') {
        const result = await deleteProviderStation(selectedStation.id)
        if (result.error) {
          setFeedback({ msg: result.error, ok: false })
        } else {
          setFeedback({ msg: 'Station removed.', ok: true })
          setLocalStations(prev => {
            const next = prev.filter(s => s.id !== selectedStation.id)
            setSelectedStation(next[0] ?? null)
            return next
          })
          setStationAction(null)
          router.refresh()
        }
      }

      if (tab === 'stations' && selectedStation && stationAction === 'approve') {
        const res = await fetch('/admin/approve-station', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stationId: selectedStation.id }),
        })
        const data = await res.json()
        if (res.ok) {
          setFeedback({ msg: 'Station approved and user changed to provider.', ok: true })
          setLocalStations(prev => {
            const next = prev.filter(s => s.id !== selectedStation.id)
            setSelectedStation(next[0] ?? null)
            return next
          })
          setStationAction(null)
          router.refresh()
        } else {
          setFeedback({ msg: data.error || 'Something went wrong.', ok: false })
        }
      }
    })
  }

  const sendDisabled =
    isPending ||
    (tab === 'users' && (!userAction || !selectedUser)) ||
    (tab === 'stations' && (!stationAction || !selectedStation))

  const [showProfile, setShowProfile] = useState(false)
  const [showUserMgmt, setShowUserMgmt] = useState(false)
  const [allUsers, setAllUsers] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string; phone: string | null; user_type: string; is_approved: boolean }[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)

  async function openUserManagement() {
    setShowUserMgmt(true)
    if (allUsers.length > 0) return
    setUsersLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, user_type, is_approved')
      .neq('user_type', 'admin')
      .order('first_name', { ascending: true })
    setAllUsers(data ?? [])
    setUsersLoading(false)
  }

  const filteredUsers = allUsers.filter(u => {
    const q = userSearch.toLowerCase()
    const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase()
    return name.includes(q) || u.email.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-950 text-white">

      {/* User management modal */}
      {showUserMgmt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowUserMgmt(false)}
        >
          <div
            className="w-180 max-h-[80vh] rounded-2xl bg-[#111318] border border-white/6 p-6 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">User Management</p>
              <button onClick={() => setShowUserMgmt(false)} className="text-gray-500 hover:text-white text-lg leading-none transition">✕</button>
            </div>
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl bg-black/40 border border-white/[0.07] text-sm text-gray-300 placeholder:text-gray-600 px-3 py-2 outline-none focus:border-cyan-500/40 mb-4 transition"
            />
            <div className="flex-1 overflow-y-auto min-h-0">
              {usersLoading ? (
                <p className="text-xs text-gray-600 text-center py-8">Loading...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">No users found.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-600 border-b border-white/6">
                      <th className="text-left pb-2 font-medium">Name</th>
                      <th className="text-left pb-2 font-medium">Email</th>
                      <th className="text-left pb-2 font-medium">Type</th>
                      <th className="text-left pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-white/4 hover:bg-white/3 transition">
                        <td className="py-2.5 pr-4 text-gray-300 font-medium">{`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || '—'}</td>
                        <td className="py-2.5 pr-4 text-gray-400">{u.email}</td>
                        <td className="py-2.5 pr-4 text-gray-400 capitalize">{u.user_type}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            u.is_approved
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                            {u.is_approved ? 'Active' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-[10px] text-gray-700 mt-3 text-right">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="w-96 rounded-2xl bg-[#111318] border border-white/6 p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-white">My Details</p>
              <button onClick={() => setShowProfile(false)} className="text-gray-500 hover:text-white text-lg leading-none transition">✕</button>
            </div>
            <AdminProfileForm
              firstName={adminFirstName}
              lastName={adminLastName}
              email={adminEmail}
              role="Administrator"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0 p-6 gap-5">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight">
              {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()}, {adminFirstName}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">Administrator</p>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition"
          >
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[9px] text-cyan-400 font-bold">
              {adminFirstName.charAt(0).toUpperCase()}
            </span>
            Profile Details
          </button>
          <button
            onClick={openUserManagement}
            className="flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition"
          >
            <span className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-[9px] text-violet-400">
              ⚙
            </span>
            Manage Users
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 shrink-0 items-center">
          {[
            { label: 'Active Users', value: totalActiveUsers, color: 'text-emerald-400' },
            { label: 'Pending Users', value: localUsers.length, color: 'text-rose-400' },
            { label: 'Stations on Map', value: totalMapStations, color: 'text-cyan-400' },
            { label: 'New Station Requests', value: localStations.length, color: 'text-amber-400' },
          ].map(({ label, value, color }, i, arr) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex items-baseline gap-2">
                <span className={`text-base font-bold tabular-nums ${color}`}>{value}</span>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              {i < arr.length - 1 && <span className="text-white/12 text-sm">|</span>}
            </div>
          ))}
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 min-h-0 gap-4">

          {/* ── Left: list panel ── */}
          <div className="w-80 shrink-0 rounded-2xl bg-[#111318] border border-white/6 flex flex-col min-h-0 overflow-hidden">
            {/* Tabs */}
            <div className="flex shrink-0 border-b border-white/6">
              {(['users', 'stations'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-3 text-xs font-medium transition border-b-2 -mb-px ${
                    tab === t ? 'text-white border-cyan-500' : 'text-gray-600 border-transparent hover:text-gray-400'
                  }`}
                >
                  {t === 'users' ? 'User Requests' : 'Charger Requests'}
                </button>
              ))}
            </div>

            {/* List header */}
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-white/6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300">
                  {tab === 'users' ? 'Pending Requests' : 'Station Requests'}
                </span>
                <span className="text-[10px] rounded-full bg-white/10 text-gray-400 px-1.5 py-0.5 font-semibold">
                  {tab === 'users' ? localUsers.length : filteredSortedStations.length}
                </span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(v => !v)}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition px-2 py-1 rounded-lg hover:bg-white/[0.05]"
                >
                  Sort
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-[#1a1d24] border border-white/10 shadow-xl overflow-hidden">
                    <p className="px-3 pt-2 pb-1 text-[9px] font-semibold text-gray-600 uppercase tracking-widest">Sort</p>
                    {(['newest', 'oldest'] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setSortOrder(opt); setShowSortMenu(false) }}
                        className={`w-full text-left px-3 py-2 text-xs transition ${
                          sortOrder === opt ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        {opt === 'newest' ? 'Newest first' : 'Oldest first'}
                      </button>
                    ))}
                    {tab === 'stations' && (
                      <>
                        <hr className="border-white/10 mx-2 my-1" />
                        <p className="px-3 pt-1 pb-1 text-[9px] font-semibold text-gray-600 uppercase tracking-widest">Speed</p>
                        {([['FAST', 'Fast Charging'], ['SLOW', 'Slow Charging']] as const).map(([type, label]) => (
                          <FilterCheckbox key={type} label={label} checked={stationTypeFilter.has(type)} onToggle={() => toggleStationType(type)} />
                        ))}
                        <hr className="border-white/10 mx-2 my-1" />
                        <p className="px-3 pt-1 pb-1 text-[9px] font-semibold text-gray-600 uppercase tracking-widest">Access</p>
                        {([['PRIVATE', 'Private Station'], ['PUBLIC', 'Public Station']] as const).map(([type, label]) => (
                          <FilterCheckbox key={type} label={label} checked={accessFilter.has(type)} onToggle={() => toggleAccessType(type)} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'users' && (
                sortedUsers.length === 0
                  ? <EmptyList label="No pending requests" />
                  : sortedUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => selectUser(u)}
                      className={`w-full text-left px-4 py-3 border-b border-white/4 transition ${
                        selectedUser?.id === u.id ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white leading-tight">{u.first_name} {u.last_name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-600">Account Type</span>
                        <span className="text-[10px] text-gray-400 capitalize">{u.user_type}</span>
                      </div>
                    </button>
                  ))
              )}
              {tab === 'stations' && (
                filteredSortedStations.length === 0
                  ? <EmptyList label="No stations" />
                  : filteredSortedStations.map(s => (
                    <button
                      key={s.id}
                      onClick={() => selectStation(s)}
                      className={`w-full text-left px-4 py-3 border-b border-white/4 transition ${
                        selectedStation?.id === s.id ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white leading-tight">{s.ownerName || '—'}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-600">Location</span>
                        <span className="text-[10px] text-gray-400 truncate max-w-32">{s.address}</span>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* ── Center: detail panel (detail left + actions right) ── */}
          <div className="flex-1 rounded-2xl bg-[#111318] border border-white/6 min-h-0 overflow-hidden flex">

            {/* Detail fields */}
            <div className="flex-1 p-7 overflow-y-auto">
              {tab === 'users' && selectedUser && (
                <>
                  <div className="flex items-start justify-between mb-7">
                    <h2 className="text-base font-bold">User Request</h2>
                    <span className="text-[10px] text-gray-600 font-mono tracking-wide">
                      {new Date(selectedUser.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="space-y-5">
                    <DetailField label="Name" value={`${selectedUser.first_name ?? ''} ${selectedUser.last_name ?? ''}`.trim()} />
                    <DetailField label="Account type" value={selectedUser.user_type} capitalize />
                    <hr className="border-white/6" />
                    <DetailField label="ID" value={selectedUser.id_number || '—'} />
                    <DetailField label="Phone number" value={selectedUser.phone || '—'} />
                    <DetailField label="Email" value={selectedUser.email} />
                    <hr className="border-white/6" />
                    <DetailField label="Request reason" value={selectedUser.request_reason?.trim() || '—'} />
                  </div>
                </>
              )}
              {tab === 'users' && !selectedUser && <EmptyCenterPanel label="Select a user to view their details" />}

              {tab === 'stations' && selectedStation && (
                <>
                  <div className="flex items-center gap-3 mb-7">
                    <h2 className="text-base font-bold">Charger Request</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      selectedStation.access_type === 'PUBLIC'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    }`}>
                      Pending approval
                    </span>
                  </div>
                  <div className="space-y-5">
                    {selectedStation.access_type === 'PRIVATE' ? (
                      <>
                        <DetailField label="Owner" value={selectedStation.ownerName || '—'} />
                        <DetailField label="Phone" value={selectedStation.ownerPhone || '—'} />
                      </>
                    ) : (
                      <>
                        <DetailField label="Station name" value={selectedStation.ownerName || '—'} />
                        <DetailField label="Operator" value={selectedStation.ownerPhone || '—'} />
                      </>
                    )}
                    <hr className="border-white/6" />
                    <DetailField label="Address" value={selectedStation.address} />
                    <DetailField label="Station type" value={selectedStation.station_type === 'FAST' ? 'Fast Charging' : 'Slow Charging'} />
                    {selectedStation.access_type === 'PUBLIC' && selectedStation.chargerCount != null && (
                      <>
                        <DetailField label="Total chargers" value={String(selectedStation.chargerCount)} />
                        <div className="flex gap-6">
                          <DetailField label="Fast" value={String(selectedStation.fastCount ?? 0)} />
                          <DetailField label="Slow" value={String(selectedStation.slowCount ?? 0)} />
                        </div>
                      </>
                    )}
                    <DetailField label="Coordinates" value={`${selectedStation.lat.toFixed(5)}, ${selectedStation.lng.toFixed(5)}`} />
                    <hr className="border-white/6" />
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Location</p>
                      <StationMiniMap lat={selectedStation.lat} lng={selectedStation.lng} address={selectedStation.address} />
                    </div>
                  </div>
                </>
              )}
              {tab === 'stations' && !selectedStation && <EmptyCenterPanel label="Select a station to view details" />}
            </div>

            {/* ── Response actions (right column) ── */}
            <div className="w-60 shrink-0 border-l border-white/6 p-5 flex flex-col gap-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Request Response</p>

              {tab === 'users' ? (
                <>
                  <ActionButton label="Accept" active={userAction === 'accept'} variant="green" icon="check"
                    onClick={() => setUserAction(userAction === 'accept' ? null : 'accept')} />
                  <ActionButton label="Deny" active={userAction === 'deny'} variant="red" icon="x"
                    onClick={() => setUserAction(userAction === 'deny' ? null : 'deny')} />
                  <textarea
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Type Response"
                    rows={5}
                    className="w-full rounded-xl bg-black/40 border border-white/[0.07] text-sm text-gray-300 placeholder:text-gray-700 p-3 outline-none focus:border-cyan-500/40 resize-none transition"
                  />
                </>
              ) : (
                <>
                  <ActionButton label="Approve" active={stationAction === 'approve'} variant="green" icon="check"
                    onClick={() => setStationAction(stationAction === 'approve' ? null : 'approve')} />
                  <ActionButton label="Remove" active={stationAction === 'remove'} variant="red" icon="x"
                    onClick={() => setStationAction(stationAction === 'remove' ? null : 'remove')} />
                </>
              )}

              <div className="flex-1" />

              {feedback && (
                <p className={`text-xs text-center py-1.5 rounded-lg ${feedback.ok ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                  {feedback.msg}
                </p>
              )}

              <button
                onClick={handleSend}
                disabled={sendDisabled}
                className="w-full rounded-xl bg-emerald-800/70 hover:bg-emerald-700/80 disabled:opacity-25 disabled:cursor-not-allowed text-white px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                {isPending ? 'Sending…' : 'Send'}
                <CheckIcon className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function DetailField({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <p className={`text-base font-semibold text-white ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{label}</p>
    </div>
  )
}

function EmptyList({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-xs text-gray-700">{label}</div>
  )
}

function EmptyCenterPanel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-sm text-gray-700">{label}</div>
  )
}

function ActionButton({
  label, active, variant, icon, onClick,
}: {
  label: string
  active: boolean
  variant: 'green' | 'red'
  icon: 'check' | 'x'
  onClick: () => void
}) {
  const base = 'w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all'
  const styles = {
    green: {
      active: 'bg-emerald-600 text-white ring-2 ring-emerald-500/40',
      idle: 'bg-emerald-600/10 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/20',
    },
    red: {
      active: 'bg-red-600 text-white ring-2 ring-red-500/40',
      idle: 'bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10',
    },
  }
  return (
    <button onClick={onClick} className={`${base} ${active ? styles[variant].active : styles[variant].idle}`}>
      {label}
      {icon === 'check' ? <CheckIcon className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
    </button>
  )
}

function FilterCheckbox({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-gray-400 hover:bg-white/[0.05] hover:text-white transition"
    >
      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${checked ? 'bg-cyan-500 border-cyan-500' : 'border-white/20'}`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {label}
    </button>
  )
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
