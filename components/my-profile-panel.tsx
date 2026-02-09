"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { X, MapPin, Share2, ChevronRight, Network, User, Link2, Loader2, Lightbulb, Target } from "lucide-react"
import type { Contact } from "@/lib/data"

interface MyProfilePanelProps {
  onClose: () => void
  onSelectContact: (id: string) => void
  contacts: Contact[]
}

export function MyProfilePanel({ onClose, onSelectContact, contacts }: MyProfilePanelProps) {
  const [profile, setProfile] = useState<{
    name: string
    initials: string
    bio: string
    big_idea_title: string
    big_idea_description: string
    big_idea_goals: string
    value_proposition: string
    tags: string
    avatar_url: string
    city: string
    country: string
    linkedin_url: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted || !user) {
          setLoading(false)
          return
        }
        const { data } = await supabase
          .from("profiles")
          .select("name, initials, bio, big_idea_title, big_idea_description, big_idea_goals, value_proposition, tags, avatar_url, city, country, linkedin_url")
          .eq("id", user.id)
          .single()
        if (mounted && data) {
          setProfile({
            name: data.name ?? "You",
            initials: data.initials ?? "U",
            bio: data.bio ?? "",
            big_idea_title: data.big_idea_title ?? "",
            big_idea_description: data.big_idea_description ?? "",
            big_idea_goals: data.big_idea_goals ?? "",
            value_proposition: data.value_proposition ?? "",
            tags: data.tags ?? "",
            avatar_url: data.avatar_url ?? "",
            city: data.city ?? "",
            country: data.country ?? "",
            linkedin_url: data.linkedin_url ?? "",
          })
        } else if (mounted) {
          setProfile({
            name: "You",
            initials: "U",
            bio: "",
            big_idea_title: "",
            big_idea_description: "",
            big_idea_goals: "",
            value_proposition: "",
            tags: "",
            avatar_url: "",
            city: "",
            country: "",
            linkedin_url: "",
          })
        }
      } catch {
        if (mounted) setProfile({ name: "You", initials: "U", bio: "", big_idea_title: "", big_idea_description: "", big_idea_goals: "", value_proposition: "", tags: "", avatar_url: "", city: "", country: "", linkedin_url: "" })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="flex w-96 shrink-0 flex-col items-center justify-center border-l border-border bg-card p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const displayName = profile?.name?.trim() || "You"
  const displayInitials = profile?.initials?.trim() || "U"
  const location = [profile?.city, profile?.country].filter(Boolean).join(", ")

  return (
    <div className="flex flex-col w-96 border-l border-border bg-card shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold text-lg">
              {displayInitials}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-foreground">{displayName}</h2>
            <p className="text-sm text-primary">Your profile</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Edit profile link */}
      <div className="px-5 py-3 border-b border-border">
        <Link
          href="/profile/setup"
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-primary/20 transition-colors text-left"
        >
          <span className="text-xs font-medium text-foreground">Edit your profile</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Location */}
      {location && (
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">{location}</span>
        </div>
      )}

      {/* Bio */}
      {profile?.bio?.trim() && (
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Bio</h3>
          <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Big Idea */}
      {(profile?.big_idea_title?.trim() || profile?.big_idea_description?.trim()) && (
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-medium text-primary uppercase tracking-wider">Big Idea</h3>
          </div>
          {profile.big_idea_title?.trim() && (
            <h4 className="text-sm font-semibold text-foreground mb-1">{profile.big_idea_title}</h4>
          )}
          {profile.big_idea_description?.trim() && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">{profile.big_idea_description}</p>
          )}
          {profile.big_idea_goals?.trim() && (
            <div className="flex flex-col gap-1">
              {profile.big_idea_goals.split(/\n/).filter(Boolean).map((goal, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <span className="text-xs text-secondary-foreground">{goal.trim()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How you add value */}
      {profile?.value_proposition?.trim() && (
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">How you add value</h3>
          <p className="text-sm text-foreground leading-relaxed">{profile.value_proposition}</p>
        </div>
      )}

      {/* Tags */}
      {profile?.tags?.trim() && (
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* LinkedIn */}
      {profile?.linkedin_url?.trim() && (
        <div className="px-5 py-4 border-b border-border">
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Link2 className="w-4 h-4" />
            LinkedIn profile
          </a>
        </div>
      )}

      {/* Your connection tree */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-medium text-primary uppercase tracking-wider">Your network</h3>
        </div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          In your tree ({contacts.length})
        </p>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectContact(c.id)}
              className="flex items-start gap-2 p-2 rounded-lg hover:bg-secondary border border-transparent hover:border-border text-left cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                {c.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.title}, {c.company}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Share / placeholder - could link to profile share later */}
      <div className="px-5 py-4">
        <Link
          href="/profile/setup"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Edit profile &amp; share card
        </Link>
      </div>
    </div>
  )
}
