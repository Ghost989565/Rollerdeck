import type { Contact, Connection } from "@/lib/data"

interface ProfileRow {
  id: string
  name: string | null
  username: string | null
  initials: string | null
  title: string | null
  company: string | null
  email: string | null
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  big_idea_title: string | null
  big_idea_description: string | null
  big_idea_goals: string | null
  value_proposition: string | null
  tags: string | null
  network_visibility: string | null
  created_at: string | null
}

function splitCsv(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
}

function splitLines(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function computeInitials(name: string) {
  if (!name.trim()) return "U"
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function toNetworkVisibility(value: string | null | undefined): Contact["networkVisibility"] {
  if (value === "public" || value === "friends" || value === "private") return value
  return "friends"
}

export function mapProfilesToContacts(rows: ProfileRow[]): Contact[] {
  return rows.map((row) => {
    const name = (row.name ?? "").trim()
    return {
      id: row.id,
      name: name || "Unnamed",
      username: (row.username ?? "").trim() || undefined,
      initials: (row.initials ?? "").trim() || computeInitials(name),
      title: (row.title ?? "").trim() || "Member",
      company: (row.company ?? "").trim() || "RollerDeck",
      email: (row.email ?? "").trim(),
      location: {
        city: (row.city ?? "").trim(),
        country: (row.country ?? "").trim(),
        lat: Number.isFinite(row.lat) ? (row.lat as number) : 0,
        lng: Number.isFinite(row.lng) ? (row.lng as number) : 0,
      },
      bigIdea: {
        title: (row.big_idea_title ?? "").trim() || "Building meaningful connections",
        description: (row.big_idea_description ?? "").trim() || "Open to collaborating with people in this network.",
        goals: splitLines(row.big_idea_goals),
      },
      valueProposition: (row.value_proposition ?? "").trim() || "Happy to collaborate and share introductions.",
      tags: splitCsv(row.tags),
      circles: [],
      introducedBy: null,
      addedAt: row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      networkVisibility: toNetworkVisibility(row.network_visibility),
    }
  })
}

export function buildConnectionsFromContacts(contacts: Contact[]): Connection[] {
  const result: Connection[] = []
  const byId = new Map(contacts.map((c) => [c.id, c]))
  const ids = contacts.map((c) => c.id)
  const seen = new Set<string>()
  const today = new Date().toISOString().slice(0, 10)
  let index = 1

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = byId.get(ids[i])
      const b = byId.get(ids[j])
      if (!a || !b) continue

      const sharedTags = a.tags.filter((t) => b.tags.includes(t))
      const sameCountry = a.location.country && b.location.country && a.location.country === b.location.country
      if (sharedTags.length === 0 && !sameCountry) continue

      const key = `${a.id}::${b.id}`
      if (seen.has(key)) continue
      seen.add(key)

      const relationship = sharedTags.length
        ? `Shared interests: ${sharedTags.slice(0, 2).join(", ")}`
        : `Nearby network in ${a.location.country}`

      result.push({
        id: `profile-conn-${index++}`,
        from: a.id,
        to: b.id,
        relationship,
        strength: Math.min(5, Math.max(1, sharedTags.length + (sameCountry ? 1 : 0))),
        date: today,
      })
    }
  }

  // Keep the graph connected even when profile data is sparse.
  if (result.length === 0 && contacts.length > 1) {
    for (let i = 1; i < contacts.length; i++) {
      result.push({
        id: `profile-conn-${index++}`,
        from: contacts[i - 1].id,
        to: contacts[i].id,
        relationship: "Introduced in RollerDeck",
        strength: 2,
        date: today,
      })
    }
  }

  return result
}

export function getConnectionsForContact(connections: Connection[], contactId: string) {
  return connections.filter((c) => c.from === contactId || c.to === contactId)
}

export function getConnectedContacts(contacts: Contact[], connections: Connection[], contactId: string) {
  const connectedIds = new Set(
    getConnectionsForContact(connections, contactId).map((c) => (c.from === contactId ? c.to : c.from))
  )
  return contacts.filter((c) => connectedIds.has(c.id))
}

export function getConnectionDetailsForContact(contacts: Contact[], connections: Connection[], contactId: string) {
  const byId = new Map(contacts.map((c) => [c.id, c]))
  return getConnectionsForContact(connections, contactId)
    .map((c) => {
      const otherId = c.from === contactId ? c.to : c.from
      const contact = byId.get(otherId)
      if (!contact) return null
      return { contact, relationship: c.relationship, strength: c.strength, date: c.date }
    })
    .filter((x): x is { contact: Contact; relationship: string; strength: number; date: string } => x != null)
}

export function getIntroductionChain(contacts: Contact[], contactId: string) {
  const byId = new Map(contacts.map((c) => [c.id, c]))
  const chain: Contact[] = []
  let current = byId.get(contactId)
  while (current?.introducedBy) {
    const introducer = byId.get(current.introducedBy)
    if (!introducer || chain.some((c) => c.id === introducer.id)) break
    chain.push(introducer)
    current = introducer
  }
  return chain
}

export function getAllTags(contacts: Contact[]) {
  return [...new Set(contacts.flatMap((c) => c.tags))].sort()
}

export function getAllCircles(contacts: Contact[]) {
  return [...new Set(contacts.flatMap((c) => c.circles).filter(Boolean))].sort()
}

export interface ConnectionRequest {
  id: string
  from_user_id: string
  to_user_id: string
  status: "pending" | "accepted" | "rejected" | "canceled"
  created_at: string
}
