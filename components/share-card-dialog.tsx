"use client"

import { useState, useMemo } from "react"
import { X, Send, Lightbulb, Target, Sparkles, Check, Copy } from "lucide-react"
import type { Contact } from "@/lib/data"
import { CONTACTS } from "@/lib/data"

interface ShareCardDialogProps {
  contact: Contact
  onClose: () => void
}

export function ShareCardDialog({ contact, onClose }: ShareCardDialogProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<Contact | null>(null)
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState(false)

  const recipients = useMemo(
    () =>
      CONTACTS.filter(
        (c) => c.id !== contact.id && c.name.toLowerCase().includes(search.toLowerCase())
      ),
    [contact.id, search]
  )

  const handleCopy = () => {
    const text = `Meet ${contact.name} - ${contact.title} at ${contact.company}\n\nBig Idea: ${contact.bigIdea.title}\n${contact.bigIdea.description}\n\nHow they add value: ${contact.valueProposition}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Share Card</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card preview */}
        <div className="px-6 py-4 border-b border-border">
          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary font-semibold text-sm">
                {contact.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{contact.name}</p>
                <p className="text-xs text-muted-foreground">{contact.title}, {contact.company}</p>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Big Idea</span>
              </div>
              <p className="text-xs font-medium text-foreground">{contact.bigIdea.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{contact.bigIdea.description}</p>
            </div>

            <div className="flex flex-col gap-1 mb-3">
              {contact.bigIdea.goals.map((goal) => (
                <div key={goal} className="flex items-start gap-1.5">
                  <Target className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span className="text-xs text-muted-foreground">{goal}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Value: </span>
                {contact.valueProposition}
              </p>
            </div>
          </div>
        </div>

        {/* Recipient selector */}
        <div className="px-6 py-4 border-b border-border">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Share with someone in your network
          </label>
          {selectedRecipient ? (
            <div className="flex items-center justify-between p-2 rounded-md bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-medium">
                  {selectedRecipient.initials}
                </div>
                <div>
                  <p className="text-sm text-foreground">{selectedRecipient.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedRecipient.company}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedRecipient(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none mb-2"
              />
              <div className="max-h-32 overflow-y-auto flex flex-col gap-0.5">
                {recipients.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelectedRecipient(r); setSearch("") }}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-medium text-foreground">
                      {r.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.company}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={!selectedRecipient}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Send Card
          </button>
        </div>
      </div>
    </div>
  )
}
