"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { CONTACTS, CONNECTIONS, getConnectedContacts, getConnectionsForContact } from "@/lib/data"
import type { Contact } from "@/lib/data"
import { createClient } from "@/lib/supabase/client"
import { AppSidebar } from "@/components/app-sidebar"
import { NetworkGlobe } from "@/components/network-globe"
import { ConnectionGraph } from "@/components/connection-graph"
import { ContactDetailPanel } from "@/components/contact-detail-panel"
import { MyProfilePanel } from "@/components/my-profile-panel"
import { ContactList } from "@/components/contact-list"
import { ShareCardDialog } from "@/components/share-card-dialog"
import { GlimmeringIntro, useHasSeenIntro } from "@/components/glimmering-intro"

const DEFAULT_USER_LOCATION = { lat: 34.0522, lng: -118.2437, name: "You" }

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
  const [activeView, setActiveView] = useState("globe")
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [shareContact, setShareContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [exploringContact, setExploringContact] = useState<Contact | null>(null)
  const [showUserConnections, setShowUserConnections] = useState(true)
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION)

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
    () => (selectedContactId && selectedContactId !== "me" ? CONTACTS.find((c) => c.id === selectedContactId) ?? null : null),
    [selectedContactId]
  )
  const viewingMe = selectedContactId === "me"

  // When exploring someone's network, show their contacts + connections
  const visibleContacts = useMemo(() => {
    if (exploringContact) {
      const theirConnections = getConnectedContacts(exploringContact.id)
      const ids = new Set([exploringContact.id, ...theirConnections.map((c) => c.id)])
      return CONTACTS.filter((c) => ids.has(c.id))
    }
    if (!searchQuery) return CONTACTS
    const q = searchQuery.toLowerCase()
    return CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.bigIdea.title.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [searchQuery, exploringContact])

  const visibleConnections = useMemo(() => {
    if (exploringContact) {
      const visibleIds = new Set(visibleContacts.map((c) => c.id))
      return CONNECTIONS.filter((conn) => visibleIds.has(conn.from) && visibleIds.has(conn.to))
    }
    return CONNECTIONS
  }, [exploringContact, visibleContacts])

  const highlightedIds = useMemo(() => {
    if (!selectedContactId) return []
    if (selectedContactId === "me") return visibleContacts.map((c) => c.id)
    return getConnectedContacts(selectedContactId).map((c) => c.id)
  }, [selectedContactId, visibleContacts])

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
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        contactCount={CONTACTS.length}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        showUserConnections={showUserConnections}
        onShowUserConnectionsChange={setShowUserConnections}
      />

      {/* Main content */}
      <main className="flex flex-1 min-w-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0">
          {/* Top bar */}
          <header className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {exploringContact
                  ? `${exploringContact.name}'s Network`
                  : activeView === "globe" ? "Network Map"
                  : activeView === "contacts" ? "All Contacts"
                  : "Connection Graph"
                }
              </h2>
              <p className="text-xs text-muted-foreground">
                {exploringContact
                  ? `Viewing ${visibleContacts.length} connections`
                  : activeView === "globe" ? "Explore your network across the world"
                  : activeView === "contacts" ? `${visibleContacts.length} people in your network`
                  : "See how your connections relate to each other"
                }
              </p>
            </div>
            {(selectedContact || viewingMe) && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {viewingMe ? "You" : selectedContact?.initials}
                </div>
                <span className="text-xs font-medium text-primary">{viewingMe ? "You" : selectedContact?.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedContactId(null)}
                  className="ml-1 text-primary/60 hover:text-primary cursor-pointer"
                >
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
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
          onClose={() => setShareContact(null)}
        />
      )}
    </div>
  )
}
