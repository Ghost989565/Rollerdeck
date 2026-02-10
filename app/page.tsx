"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { CONTACTS, CONNECTIONS } from "@/lib/data"
import type { Contact, Connection } from "@/lib/data"
import { createClient } from "@/lib/supabase/client"
import {
  buildConnectionsFromContacts,
  ConnectionRequest,
  getAllCircles,
  getAllTags,
  getConnectedContacts,
  mapProfilesToContacts,
} from "@/lib/network-utils"
import { Menu } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { NetworkGlobe } from "@/components/network-globe"
import { ConnectionGraph } from "@/components/connection-graph"
import { ContactDetailPanel } from "@/components/contact-detail-panel"
import { MyProfilePanel } from "@/components/my-profile-panel"
import { ContactList } from "@/components/contact-list"
import { ShareCardDialog } from "@/components/share-card-dialog"
import { AddConnectionDialog } from "@/components/add-connection-dialog"
import { GlimmeringIntro, useHasSeenIntro } from "@/components/glimmering-intro"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Sheet, SheetContent } from "@/components/ui/sheet"

const DEFAULT_USER_LOCATION = { lat: 34.0522, lng: -118.2437, name: "You" }
const missingUsernameColumn = (message?: string) => (message || "").includes("username")

export default function RollerDeckPage() {
  const { hasSeen, markAsSeen } = useHasSeenIntro()

  if (hasSeen === null) {
    return <div className="flex h-screen w-full items-center justify-center bg-background" aria-hidden />
  }

  if (hasSeen === false) {
    return <GlimmeringIntro onEnter={markAsSeen} />
  }

  return <RollerDeckApp />
}

function RollerDeckApp() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>(CONTACTS)
  const [connections, setConnections] = useState<Connection[]>(CONNECTIONS)
  const [activeView, setActiveView] = useState("globe")
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [shareContact, setShareContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [exploringContact, setExploringContact] = useState<Contact | null>(null)
  const [showUserConnections, setShowUserConnections] = useState(true)
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION)
  const [contactDataSource, setContactDataSource] = useState<"demo" | "supabase">("demo")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([])
  const [showAddConnection, setShowAddConnection] = useState(false)

  const refreshNetworkData = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setCurrentUserId(null)
        setPendingRequests([])
        return
      }

      setCurrentUserId(user.id)

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, username, initials, title, company, email, city, country, lat, lng, big_idea_title, big_idea_description, big_idea_goals, value_proposition, tags, network_visibility, created_at")
        .order("created_at", { ascending: true })
      let finalProfiles = profiles
      if (profilesError && missingUsernameColumn(profilesError.message)) {
        const { data: fallbackProfiles, error: fallbackError } = await supabase
          .from("profiles")
          .select("id, name, initials, title, company, email, city, country, lat, lng, big_idea_title, big_idea_description, big_idea_goals, value_proposition, tags, network_visibility, created_at")
          .order("created_at", { ascending: true })
        if (fallbackError) throw fallbackError
        finalProfiles = fallbackProfiles
      } else if (profilesError) {
        throw profilesError
      }

      const mappedProfiles = mapProfilesToContacts(finalProfiles ?? [])
      const networkContacts = mappedProfiles.filter((c) => c.id !== user.id)
      setContacts(networkContacts)
      setContactDataSource("supabase")

      const { data: profileConnections, error: connectionsError } = await supabase
        .from("profile_connections")
        .select("id, user_a, user_b, created_at")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      if (connectionsError) throw connectionsError

      const mappedConnections: Connection[] = (profileConnections ?? []).map((c) => ({
        id: c.id,
        from: c.user_a,
        to: c.user_b,
        relationship: "Connected on RollerDeck",
        strength: 4,
        date: c.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      }))

      if (mappedConnections.length) {
        setConnections(mappedConnections)
      } else if (networkContacts.length) {
        setConnections(buildConnectionsFromContacts(networkContacts))
      } else {
        setConnections([])
      }

      const { data: requests, error: requestError } = await supabase
        .from("connection_requests")
        .select("id, from_user_id, to_user_id, status, created_at")
        .eq("status", "pending")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      if (requestError) throw requestError
      setPendingRequests((requests ?? []) as ConnectionRequest[])
    } catch {
      // Keep existing in-memory data.
    }
  }, [])

  useEffect(() => {
    void refreshNetworkData()
  }, [refreshNetworkData])

  useEffect(() => {
    let mounted = true
    async function loadUserLocation() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted || !user) return
        const { data: profile } = await supabase
          .from("profiles")
          .select("lat, lng, city")
          .eq("id", user.id)
          .single()
        if (mounted && profile && profile.lat != null && profile.lng != null && (profile.lat !== 0 || profile.lng !== 0)) {
          setUserLocation({
            lat: profile.lat,
            lng: profile.lng,
            name: profile.city?.trim() ? `${profile.city} (You)` : "You",
          })
        }
      } catch {
        // Keep default location
      }
    }
    loadUserLocation()
    return () => { mounted = false }
  }, [])

  const selectedContact = useMemo(
    () => (selectedContactId && selectedContactId !== "me" ? contacts.find((c) => c.id === selectedContactId) ?? null : null),
    [selectedContactId, contacts]
  )
  const viewingMe = selectedContactId === "me"

  useEffect(() => {
    if (!selectedContactId || selectedContactId === "me") return
    if (!contacts.some((c) => c.id === selectedContactId)) setSelectedContactId(null)
  }, [selectedContactId, contacts])

  // When exploring someone's network, show their contacts + connections
  const visibleContacts = useMemo(() => {
    if (exploringContact) {
      const theirConnections = getConnectedContacts(contacts, connections, exploringContact.id)
      const ids = new Set([exploringContact.id, ...theirConnections.map((c) => c.id)])
      return contacts.filter((c) => ids.has(c.id))
    }
    if (!searchQuery) return contacts
    const q = searchQuery.toLowerCase()
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.bigIdea.title.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [searchQuery, exploringContact, contacts, connections])

  const visibleConnections = useMemo(() => {
    if (exploringContact) {
      const visibleIds = new Set(visibleContacts.map((c) => c.id))
      return connections.filter((conn) => visibleIds.has(conn.from) && visibleIds.has(conn.to))
    }
    return connections
  }, [exploringContact, visibleContacts, connections])

  const highlightedIds = useMemo(() => {
    if (!selectedContactId) return []
    if (selectedContactId === "me") return visibleContacts.map((c) => c.id)
    return getConnectedContacts(contacts, visibleConnections, selectedContactId).map((c) => c.id)
  }, [selectedContactId, visibleContacts, contacts, visibleConnections])

  const availableTags = useMemo(() => getAllTags(visibleContacts), [visibleContacts])
  const availableCircles = useMemo(() => getAllCircles(visibleContacts), [visibleContacts])

  const handleExploreNetwork = useCallback((contact: Contact) => {
    if (contact.networkVisibility === "private") return
    setExploringContact(contact)
    setActiveView("globe")
    setSelectedContactId(null)
  }, [])

  const handleStopExploring = useCallback(() => {
    setExploringContact(null)
    setSelectedContactId(null)
  }, [])

  const handleViewChange = useCallback((view: string) => {
    setActiveView(view)
    setExploringContact((prev) => (prev ? null : prev))
  }, [])

  // Click same person again to deselect (clear connection lines)
  const handleSelectContact = useCallback((id: string) => {
    setSelectedContactId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Sidebar: drawer on mobile, always visible on desktop */}
      {!isMobile && (
        <AppSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          contactCount={contacts.length}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          onAddConnection={() => setShowAddConnection(true)}
          showUserConnections={showUserConnections}
          onShowUserConnectionsChange={setShowUserConnections}
        />
      )}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-[280px] p-0 gap-0 border-r overflow-y-auto">
            <AppSidebar
              activeView={activeView}
              onViewChange={(view) => {
                handleViewChange(view)
                setSidebarOpen(false)
              }}
              contactCount={contacts.length}
              onSearch={setSearchQuery}
              searchQuery={searchQuery}
              onAddConnection={() => {
                setShowAddConnection(true)
                setSidebarOpen(false)
              }}
              showUserConnections={showUserConnections}
              onShowUserConnectionsChange={setShowUserConnections}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <main className="flex flex-1 min-w-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Top bar */}
          <header className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 border-b border-border shrink-0">
            {isMobile && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer touch-manipulation"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-foreground truncate">
                {exploringContact
                  ? `${exploringContact.name}'s Network`
                  : activeView === "globe" ? "Network Map"
                  : activeView === "contacts" ? "All Contacts"
                  : "Connection Graph"
                }
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {exploringContact
                  ? `Viewing ${visibleContacts.length} connections`
                  : activeView === "globe" ? "Explore your network across the world"
                  : activeView === "contacts" ? `${visibleContacts.length} people in your network`
                  : "See how your connections relate to each other"}
                {!exploringContact && contactDataSource === "supabase" ? " • Synced from Supabase" : ""}
              </p>
            </div>
            {currentUserId && (
              <button
                type="button"
                onClick={() => setShowAddConnection(true)}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
              >
                Add Connection
              </button>
            )}
            {(selectedContact || viewingMe) && (
              <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 shrink-0">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                  {viewingMe ? "You" : selectedContact?.initials}
                </div>
                <span className="text-xs font-medium text-primary truncate max-w-[120px] sm:max-w-none">{viewingMe ? "You" : selectedContact?.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedContactId(null)}
                  className="flex items-center justify-center min-w-[36px] min-h-[36px] ml-0.5 rounded-md text-primary/60 hover:text-primary hover:bg-primary/10 cursor-pointer touch-manipulation"
                  aria-label="Clear selection"
                >
                  <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                    <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
          </header>

          {/* View content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeView === "globe" && (
              <NetworkGlobe
                contacts={visibleContacts}
                connections={visibleConnections}
                selectedContactId={selectedContactId}
                onSelectContact={handleSelectContact}
                highlightedIds={highlightedIds}
                exploringContact={exploringContact}
                onStopExploring={handleStopExploring}
                userLocation={userLocation}
                showUserConnectionLines={showUserConnections}
              />
            )}
            {activeView === "contacts" && (
              <ContactList
                contacts={visibleContacts}
                selectedContactId={selectedContactId}
                onSelectContact={handleSelectContact}
                availableTags={availableTags}
                availableCircles={availableCircles}
              />
            )}
            {activeView === "graph" && (
              <ConnectionGraph
                contacts={visibleContacts}
                connections={visibleConnections}
                selectedContactId={selectedContactId}
                onSelectContact={handleSelectContact}
                showUserNode={showUserConnections}
              />
            )}
          </div>
        </div>

        {/* Detail panel */}
        {viewingMe && (
          <MyProfilePanel
            onClose={() => setSelectedContactId(null)}
            onSelectContact={handleSelectContact}
            contacts={visibleContacts}
          />
        )}
        {selectedContact && (
          <ContactDetailPanel
            contact={selectedContact}
            contacts={contacts}
            connections={visibleConnections}
            onClose={() => setSelectedContactId(null)}
            onSelectContact={handleSelectContact}
            onShareContact={setShareContact}
            onExploreNetwork={handleExploreNetwork}
          />
        )}
      </main>

      {/* Share dialog */}
      {shareContact && (
        <ShareCardDialog
          contact={shareContact}
          recipientsPool={contacts}
          onClose={() => setShareContact(null)}
        />
      )}
      {showAddConnection && currentUserId && (
        <AddConnectionDialog
          currentUserId={currentUserId}
          contacts={contacts}
          existingConnections={connections}
          pendingRequests={pendingRequests}
          onClose={() => setShowAddConnection(false)}
          onNetworkUpdated={refreshNetworkData}
        />
      )}
    </div>
  )
}
