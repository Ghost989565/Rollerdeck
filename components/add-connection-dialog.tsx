"use client"

import { useMemo, useState } from "react"
import { Check, Loader2, Search, Send, UserPlus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Contact, Connection } from "@/lib/data"
import type { ConnectionRequest } from "@/lib/network-utils"
const missingUsernameColumn = (message?: string) => (message || "").includes("username")

interface SearchProfile {
  id: string
  name: string
  username: string
  initials: string
  title: string
  company: string
  city: string
  country: string
  network_visibility: "public" | "friends" | "private"
}

interface AddConnectionDialogProps {
  currentUserId: string
  contacts: Contact[]
  existingConnections: Connection[]
  pendingRequests: ConnectionRequest[]
  onClose: () => void
  onNetworkUpdated: () => Promise<void> | void
}

function orderedPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a]
}

function normalizeUsername(input: string) {
  return input.trim().replace(/^@+/, "").toLowerCase()
}

export function AddConnectionDialog({
  currentUserId,
  contacts,
  existingConnections,
  pendingRequests,
  onClose,
  onNetworkUpdated,
}: AddConnectionDialogProps) {
  const supabase = createClient()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [results, setResults] = useState<SearchProfile[]>([])

  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])

  const incomingRequests = useMemo(
    () => pendingRequests.filter((r) => r.to_user_id === currentUserId),
    [pendingRequests, currentUserId]
  )
  const outgoingRequests = useMemo(
    () => pendingRequests.filter((r) => r.from_user_id === currentUserId),
    [pendingRequests, currentUserId]
  )

  const isConnected = (profileId: string) =>
    existingConnections.some(
      (c) =>
        (c.from === currentUserId && c.to === profileId) ||
        (c.to === currentUserId && c.from === profileId)
    )

  const outgoingRequestFor = (profileId: string) =>
    pendingRequests.find((r) => r.status === "pending" && r.from_user_id === currentUserId && r.to_user_id === profileId)

  const incomingRequestFor = (profileId: string) =>
    pendingRequests.find((r) => r.status === "pending" && r.to_user_id === currentUserId && r.from_user_id === profileId)

  async function runSearch() {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }

    setSearching(true)
    setError("")
    try {
      const { data: publicMatches, error: publicError } = await supabase
        .from("profiles")
        .select("id, name, username, initials, title, company, city, country, network_visibility")
        .neq("id", currentUserId)
        .in("network_visibility", ["public", "friends"])
        .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(20)
      let finalMatches = publicMatches
      if (publicError && missingUsernameColumn(publicError.message)) {
        const { data: fallbackMatches, error: fallbackError } = await supabase
          .from("profiles")
          .select("id, name, initials, title, company, city, country, network_visibility")
          .neq("id", currentUserId)
          .in("network_visibility", ["public", "friends"])
          .ilike("name", `%${q}%`)
          .limit(20)
        if (fallbackError) throw fallbackError
        finalMatches = fallbackMatches
      } else if (publicError) {
        throw publicError
      }

      const merged = new Map<string, SearchProfile>()
      ;(finalMatches ?? []).forEach((row) => {
        merged.set(row.id, {
          id: row.id,
          name: row.name ?? "Unnamed",
          username: "username" in row ? (row.username ?? "") : "",
          initials: row.initials ?? "U",
          title: row.title ?? "Member",
          company: row.company ?? "RollerDeck",
          city: row.city ?? "",
          country: row.country ?? "",
          network_visibility: (row.network_visibility as SearchProfile["network_visibility"]) || "friends",
        })
      })

      const username = normalizeUsername(q)
      if (username.length >= 3) {
        const { data: privateMatch, error: rpcError } = await supabase.rpc("find_profile_by_username", {
          p_username: username,
        })
        if (!rpcError && privateMatch?.length) {
          const row = privateMatch[0]
          merged.set(row.id, {
            id: row.id,
            name: row.name ?? "Unnamed",
            username: row.username ?? "",
            initials: row.initials ?? "U",
            title: row.title ?? "Member",
            company: row.company ?? "RollerDeck",
            city: row.city ?? "",
            country: row.country ?? "",
            network_visibility: (row.network_visibility as SearchProfile["network_visibility"]) || "private",
          })
        }
      }

      setResults(Array.from(merged.values()))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search profiles.")
    } finally {
      setSearching(false)
    }
  }

  async function connect(profileId: string) {
    setSavingId(profileId)
    setError("")
    try {
      const [userA, userB] = orderedPair(currentUserId, profileId)
      const { error } = await supabase
        .from("profile_connections")
        .upsert({ user_a: userA, user_b: userB, created_by: currentUserId }, { onConflict: "user_a,user_b" })
      if (error) throw error
      await onNetworkUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add connection.")
    } finally {
      setSavingId(null)
    }
  }

  async function sendRequest(profileId: string) {
    setSavingId(profileId)
    setError("")
    try {
      const { error } = await supabase
        .from("connection_requests")
        .upsert(
          {
            from_user_id: currentUserId,
            to_user_id: profileId,
            status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "from_user_id,to_user_id" }
        )
      if (error) throw error
      await onNetworkUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request.")
    } finally {
      setSavingId(null)
    }
  }

  async function acceptRequest(request: ConnectionRequest) {
    setSavingId(request.id)
    setError("")
    try {
      const { error: updateError } = await supabase
        .from("connection_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", request.id)
      if (updateError) throw updateError

      const [userA, userB] = orderedPair(request.from_user_id, request.to_user_id)
      const { error: connectError } = await supabase
        .from("profile_connections")
        .upsert({ user_a: userA, user_b: userB, created_by: currentUserId }, { onConflict: "user_a,user_b" })
      if (connectError) throw connectError

      await onNetworkUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept request.")
    } finally {
      setSavingId(null)
    }
  }

  async function rejectRequest(request: ConnectionRequest) {
    setSavingId(request.id)
    setError("")
    try {
      const { error } = await supabase
        .from("connection_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", request.id)
      if (error) throw error
      await onNetworkUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject request.")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Add Connection</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">
            Search by name for public profiles, or use <span className="text-foreground font-medium">@username</span> for private lookup.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-md bg-secondary border border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch()
                }}
                placeholder="e.g. Maya or @maya_chen"
                className="w-full bg-transparent outline-none text-sm text-foreground"
              />
            </div>
            <button
              type="button"
              onClick={runSearch}
              disabled={searching}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {results.length > 0 && (
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Search Results</p>
              <div className="flex flex-col gap-2">
                {results.map((profile) => {
                  const connected = isConnected(profile.id)
                  const outgoing = outgoingRequestFor(profile.id)
                  const incoming = incomingRequestFor(profile.id)
                  const isPrivate = profile.network_visibility === "private"

                  return (
                    <div key={profile.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{profile.username || "no-username"} {profile.city || profile.country ? `• ${[profile.city, profile.country].filter(Boolean).join(", ")}` : ""}
                        </p>
                        <p className="text-xs text-primary truncate">{profile.title}, {profile.company}</p>
                      </div>

                      {connected ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-emerald-500/15 text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          Connected
                        </span>
                      ) : incoming ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={savingId === incoming.id}
                            onClick={() => acceptRequest(incoming)}
                            className="px-2.5 py-1.5 text-xs rounded-md bg-primary text-primary-foreground disabled:opacity-60"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={savingId === incoming.id}
                            onClick={() => rejectRequest(incoming)}
                            className="px-2.5 py-1.5 text-xs rounded-md border border-border text-muted-foreground disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      ) : outgoing ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-amber-500/15 text-amber-400">
                          <Send className="w-3.5 h-3.5" />
                          Request sent
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={savingId === profile.id}
                          onClick={() => (isPrivate ? sendRequest(profile.id) : connect(profile.id))}
                          className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center gap-1.5"
                        >
                          {savingId === profile.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          {isPrivate ? "Request" : "Connect"}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Incoming Requests</p>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending requests.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {incomingRequests.map((r) => {
                  const c = contactsById.get(r.from_user_id)
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-md border border-border">
                      <p className="text-sm text-foreground truncate">{c?.name || r.from_user_id}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={savingId === r.id}
                          onClick={() => acceptRequest(r)}
                          className="px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={savingId === r.id}
                          onClick={() => rejectRequest(r)}
                          className="px-2 py-1 text-xs rounded-md border border-border text-muted-foreground disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Outgoing Requests</p>
            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending requests.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {outgoingRequests.map((r) => {
                  const c = contactsById.get(r.to_user_id)
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-md border border-border">
                      <p className="text-sm text-foreground truncate">{c?.name || r.to_user_id}</p>
                      <span className="text-xs text-amber-400">Pending</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
