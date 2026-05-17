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

export function getTimeGreeting(hours: number): string {
  if (hours < 12) return 'Good morning'
  if (hours < 17) return 'Good afternoon'
  return 'Good evening'
}

export function sortUsers(users: PendingUser[], order: 'newest' | 'oldest'): PendingUser[] {
  return [...users].sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return order === 'newest' ? diff : -diff
  })
}

export function sortStations(stations: StationWithOwner[], order: 'newest' | 'oldest'): StationWithOwner[] {
  return order === 'newest' ? [...stations] : [...stations].reverse()
}

export function filterStations(
  stations: StationWithOwner[],
  typeFilter: Set<string>,
  accessFilter: Set<string>
): StationWithOwner[] {
  return stations.filter(s => typeFilter.has(s.station_type) && accessFilter.has(s.access_type))
}

export function isSendDisabled({
  isPending,
  tab,
  userAction,
  selectedUser,
  stationAction,
  selectedStation,
}: {
  isPending: boolean
  tab: 'users' | 'stations'
  userAction: 'accept' | 'deny' | null
  selectedUser: object | null
  stationAction: 'remove' | null
  selectedStation: object | null
}): boolean {
  return (
    isPending ||
    (tab === 'users' && (!userAction || !selectedUser)) ||
    (tab === 'stations' && (!stationAction || !selectedStation))
  )
}

export function toggleSetItem(current: Set<string>, item: string): Set<string> {
  const next = new Set(current)
  if (next.has(item)) next.delete(item)
  else next.add(item)
  return next
}
