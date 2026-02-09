"use client"

import { useState, useMemo } from "react"
import { Search, Filter, X } from "lucide-react"
import type { Contact } from "@/lib/data"
import { ALL_TAGS, ALL_CIRCLES } from "@/lib/data"

interface ContactListProps {
  contacts: Contact[]
  selectedContactId: string | null
  onSelectContact: (id: string) => void
}

export function ContactList({ contacts, selectedContactId, onSelectContact }: ContactListProps) {
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCircles, setSelectedCircles] = useState<string[]>([])

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.bigIdea.title.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))

      const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => c.tags.includes(t))
      const matchesCircles = selectedCircles.length === 0 || selectedCircles.some((ci) => c.circles.includes(ci))

      return matchesSearch && matchesTags && matchesCircles
    })
  }, [contacts, search, selectedTags, selectedCircles])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  const toggleCircle = (circle: string) => {
    setSelectedCircles((prev) => prev.includes(circle) ? prev.filter((c) => c !== circle) : [...prev, circle])
  }

  const hasActiveFilters = selectedTags.length > 0 || selectedCircles.length > 0

  return (
    <div className="flex flex-col w-full h-full">
      {/* Search bar */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-md bg-secondary border border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts, ideas, tags..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="cursor-pointer text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-md border border-border cursor-pointer transition-colors ${
            hasActiveFilters ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-border">
          <div className="mb-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 text-xs rounded-md cursor-pointer transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                  aria-pressed={selectedTags.includes(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Circles</h4>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CIRCLES.map((circle) => (
                <button
                  key={circle}
                  type="button"
                  onClick={() => toggleCircle(circle)}
                  className={`px-2 py-0.5 text-xs rounded-md cursor-pointer transition-colors ${
                    selectedCircles.includes(circle)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                  aria-pressed={selectedCircles.includes(circle)}
                >
                  {circle}
                </button>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setSelectedTags([]); setSelectedCircles([]) }}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">{filteredContacts.length} contacts</span>
      </div>

      {/* Contact cards */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 p-2">
          {filteredContacts.map((contact) => {
            const isSelected = contact.id === selectedContactId
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelectContact(contact.id)}
                className={`flex items-start gap-3 p-3 rounded-lg text-left cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary border border-transparent"
                }`}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-sm font-semibold ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}>
                  {contact.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{contact.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{contact.title}, {contact.company}</p>
                  <p className="text-xs text-primary/80 mt-1 truncate">{contact.bigIdea.title}</p>
                  <div className="flex gap-1 mt-1.5">
                    {contact.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
