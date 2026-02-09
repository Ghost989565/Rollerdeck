"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

const INTRO_STORAGE_KEY = "rollerdeck_has_seen_intro"
const MAP_SVG_PATH = "/map-dark.svg"

export function useHasSeenIntro() {
  const [hasSeen, setHasSeen] = useState<boolean | null>(null)
  useEffect(() => {
    setHasSeen(typeof localStorage !== "undefined" && localStorage.getItem(INTRO_STORAGE_KEY) === "true")
  }, [])
  return { hasSeen, markAsSeen: () => {
    if (typeof localStorage !== "undefined") localStorage.setItem(INTRO_STORAGE_KEY, "true")
    setHasSeen(true)
  } }
}

interface GlimmeringIntroProps {
  onEnter: () => void
}

export function GlimmeringIntro({ onEnter }: GlimmeringIntroProps) {
  const [svgContent, setSvgContent] = useState("")
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    fetch(MAP_SVG_PATH)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setSvgContent(text)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [mounted])

  useEffect(() => {
    if (!svgContent || !containerRef.current) return
    const style = document.createElement("style")
    style.id = "glimmer-keyframes"
    style.textContent = `
      @keyframes glimmer-intro {
        0% { opacity: 1; }
        100% { opacity: 0.15; }
      }
    `
    if (!document.getElementById("glimmer-keyframes")) {
      document.head.appendChild(style)
    }
    const timer = setTimeout(() => {
      const rects = containerRef.current?.querySelectorAll("rect")
      rects?.forEach((rect) => {
        const duration = Math.random() * 1.5 + 0.5
        const delay = Math.random() * 1
        rect.setAttribute(
          "style",
          `animation: glimmer-intro ${duration}s ease-in-out ${delay}s infinite alternate;`
        )
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [svgContent])

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="h-[60vh] w-full max-w-4xl animate-pulse rounded-lg bg-secondary/50" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background">
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center opacity-40"
        aria-hidden
      >
        {svgContent ? (
          <div
            className="h-full w-full max-h-[100vh] max-w-[1138px] overflow-hidden"
            style={{ aspectRatio: "1138 / 640" }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="h-[60vh] w-full max-w-4xl animate-pulse rounded-lg bg-secondary/50" />
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            RollerDeck
          </h1>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground sm:text-base">
          Map your network. See who’s near you. Connect with the right people.
        </p>
        <Button
          size="lg"
          onClick={onEnter}
          className="min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Enter your network
        </Button>
      </div>
    </div>
  )
}
