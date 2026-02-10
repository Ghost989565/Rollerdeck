"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Globe, Users, Network, Search, Sparkles, Settings, Lock, ChevronDown, ChevronUp, User, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"

interface AppSidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  contactCount: number
  onSearch: (query: string) => void
  searchQuery: string
  onAddConnection?: () => void
  showUserConnections?: boolean
  onShowUserConnectionsChange?: (show: boolean) => void
}

const navItems = [
  { id: "globe", label: "Network Map", icon: Globe },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "graph", label: "Connections", icon: Network },
]

const visibilityOptions = [
  { value: "public" as const, label: "Public", description: "Anyone can see your network", icon: Globe },
  { value: "friends" as const, label: "Friends Only", description: "Only your connections can see", icon: Users },
  { value: "private" as const, label: "Private", description: "Nobody can see your network", icon: Lock },
]

export function AppSidebar({ activeView, onViewChange, contactCount, onSearch, searchQuery, onAddConnection, showUserConnections = true, onShowUserConnectionsChange }: AppSidebarProps) {
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)
  const [myVisibility, setMyVisibility] = useState<"public" | "friends" | "private">("public")
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadVisibility() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !mounted) return
        const { data } = await supabase
          .from("profiles")
          .select("network_visibility")
          .eq("id", user.id)
          .single()
        if (!mounted || !data?.network_visibility) return
        if (data.network_visibility === "public" || data.network_visibility === "friends" || data.network_visibility === "private") {
          setMyVisibility(data.network_visibility)
        }
      } catch {
        // Keep local default if Supabase is unavailable.
      }
    }
    loadVisibility()
    return () => {
      mounted = false
    }
  }, [])

  async function handleVisibilityChange(value: "public" | "friends" | "private") {
    setMyVisibility(value)
    setSavingVisibility(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from("profiles")
        .update({ network_visibility: value, updated_at: new Date().toISOString() })
        .eq("id", user.id)
    } catch {
      // Keep local selection even if request fails.
    } finally {
      setSavingVisibility(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // Continue to login route even if Supabase is not configured.
    } finally {
      router.push("/auth/login")
      router.refresh()
      setSigningOut(false)
    }
  }

  return (
    <aside className="flex flex-col w-60 border-r border-border bg-card shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-tight">RollerDeck</h1>
          <p className="text-[11px] text-muted-foreground">{contactCount} connections</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary border border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search network..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-3 py-2 flex-1">
        {onAddConnection && (
          <button
            type="button"
            onClick={onAddConnection}
            className="mb-2 flex items-center justify-center gap-2 px-2.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            Add Connection
          </button>
        )}
        <p className="px-2 pb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Views</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Show my connections - always visible */}
      {onShowUserConnectionsChange != null && (
        <div className="px-3 py-2 border-t border-border">
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md hover:bg-secondary">
            <span className="text-xs font-medium text-foreground">Show my connections</span>
            <Switch
              checked={showUserConnections}
              onCheckedChange={onShowUserConnectionsChange}
              aria-label="Show my connections on map and graph"
            />
          </div>
        </div>
      )}

      {/* My Network Settings */}
      <div className="px-3 py-2 border-t border-border">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center justify-between w-full px-2.5 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4" />
            My Settings
          </div>
          {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showSettings && (
          <div className="mt-1.5 px-2 pb-2">
            <Link
              href="/profile/setup"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors mb-2"
            >
              <User className="w-3.5 h-3.5" />
              Edit profile
            </Link>
            <button
              type="button"
              disabled={signingOut}
              onClick={handleSignOut}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors mb-2 disabled:opacity-60 disabled:cursor-not-allowed w-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
              Network Visibility
            </p>
            <div className="flex flex-col gap-1">
              {visibilityOptions.map((option) => {
                const OptIcon = option.icon
                const isSelected = myVisibility === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleVisibilityChange(option.value)}
                    disabled={savingVisibility}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-secondary border border-transparent"
                    )}
                  >
                    <OptIcon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <p className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-foreground")}>{option.label}</p>
                      <p className="text-[10px] text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-4 border-t border-border">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-foreground">{contactCount}</span>
            <span className="text-[10px] text-muted-foreground">Contacts</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-foreground">7</span>
            <span className="text-[10px] text-muted-foreground">Circles</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
