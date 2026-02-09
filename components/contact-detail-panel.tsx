"use client"

import { X, MapPin, Lightbulb, Target, Share2, ChevronRight, Globe, Lock, Users, Eye, Network, User } from "lucide-react"
import type { Contact } from "@/lib/data"
import { getIntroductionChain, getConnectedContacts, getConnectionDetailsForContact } from "@/lib/data"

interface ContactDetailPanelProps {
  contact: Contact
  onClose: () => void
  onSelectContact: (id: string) => void
  onShareContact: (contact: Contact) => void
  onExploreNetwork?: (contact: Contact) => void
}

const visibilityConfig = {
  public: { label: "Public Network", icon: Globe, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  friends: { label: "Friends Only", icon: Users, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  private: { label: "Private Network", icon: Lock, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
}

export function ContactDetailPanel({ contact, onClose, onSelectContact, onShareContact, onExploreNetwork }: ContactDetailPanelProps) {
  const introChain = getIntroductionChain(contact.id)
  const connectedContacts = getConnectedContacts(contact.id)
  const connectionDetails = getConnectionDetailsForContact(contact.id)
  const vis = visibilityConfig[contact.networkVisibility]
  const VisIcon = vis.icon
  const canExplore = contact.networkVisibility !== "private"

  return (
    <div className="flex flex-col w-96 border-l border-border bg-card shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 text-primary font-semibold text-lg">
            {contact.initials}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{contact.name}</h2>
            <p className="text-sm text-muted-foreground">{contact.title}</p>
            <p className="text-sm text-primary">{contact.company}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Location + Network Visibility */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{contact.location.city}, {contact.location.country}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium ${vis.bg} ${vis.color}`}>
          <VisIcon className="w-3 h-3" />
          {vis.label}
        </div>
      </div>

      {/* Explore Network CTA */}
      {canExplore && onExploreNetwork && (
        <div className="px-5 py-3 border-b border-border">
          <button
            type="button"
            onClick={() => onExploreNetwork(contact)}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-primary/20 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-foreground">Explore their network</p>
                <p className="text-[10px] text-muted-foreground">
                  {contact.networkVisibility === "public" ? "Open to everyone" : "Shared with connections"}
                  {' \u00b7 '}{connectedContacts.length} connections
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </div>
      )}

      {/* How you're connected (intro chain - like 23andMe path) */}
      {(introChain.length > 0 || connectionDetails.length > 0) && (
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-medium text-primary uppercase tracking-wider">Connection tree</h3>
          </div>
          {introChain.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">How you're connected</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                  <User className="w-3 h-3" />
                  You
                </span>
                {/* Intro chain: root first (reverse), then contact */}
                {[...introChain].reverse().map((person) => (
                  <span key={person.id} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <button
                      type="button"
                      onClick={() => onSelectContact(person.id)}
                      className="px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground hover:text-primary cursor-pointer font-medium transition-colors"
                    >
                      {person.name}
                    </button>
                  </span>
                ))}
                <span className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="px-2 py-1 rounded-md bg-primary/15 text-primary font-medium">{contact.name}</span>
                </span>
              </div>
            </div>
          )}
          {connectionDetails.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                In their network ({connectionDetails.length})
              </p>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {connectionDetails.map(({ contact: c, relationship, date }) => (
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
                      <p className="text-xs text-primary/90 truncate">{relationship}</p>
                      {date && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Big Idea */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-medium text-primary uppercase tracking-wider">Big Idea</h3>
        </div>
        <h4 className="text-sm font-semibold text-foreground mb-1">{contact.bigIdea.title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{contact.bigIdea.description}</p>
        <div className="flex flex-col gap-1.5">
          {contact.bigIdea.goals.map((goal) => (
            <div key={goal} className="flex items-start gap-2">
              <Target className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span className="text-xs text-secondary-foreground">{goal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Value Proposition */}
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">How they add value</h3>
        <p className="text-sm text-foreground leading-relaxed">{contact.valueProposition}</p>
      </div>

      {/* Tags */}
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tags</h3>
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground">{tag}</span>
          ))}
        </div>
      </div>

      {/* Circles */}
      {contact.circles.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Circles</h3>
          <div className="flex flex-wrap gap-1.5">
            {contact.circles.map((circle) => (
              <span key={circle} className="px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary">{circle}</span>
            ))}
          </div>
        </div>
      )}

      {/* Share action */}
      <div className="px-5 py-4">
        <button
          type="button"
          onClick={() => onShareContact(contact)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 cursor-pointer transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share this card
        </button>
      </div>
    </div>
  )
}
