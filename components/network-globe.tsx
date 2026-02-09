"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"
import { Globe, Map, ZoomIn, ZoomOut, ArrowLeft, Eye } from "lucide-react"
import type { Contact, Connection } from "@/lib/data"

const ZOOM_MIN = 0.4
const ZOOM_MAX = 4

interface GeoFeature {
  type: string
  geometry: any
  properties: any
}

function interpolateProjection(raw0: any, raw1: any) {
  const mutate: any = d3.geoProjectionMutator((t: number) => (x: number, y: number) => {
    const [x0, y0] = raw0(x, y)
    const [x1, y1] = raw1(x, y)
    return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)]
  })
  let t = 0
  return Object.assign((mutate as any)(t), {
    alpha(_: number) {
      return arguments.length ? (mutate as any)((t = +_)) : t
    },
  })
}

interface NetworkGlobeProps {
  contacts: Contact[]
  connections: Connection[]
  selectedContactId: string | null
  onSelectContact: (id: string) => void
  highlightedIds?: string[]
  exploringContact?: Contact | null
  onStopExploring?: () => void
  userLocation?: { lat: number; lng: number; name: string }
  showUserConnectionLines?: boolean
}

export function NetworkGlobe({
  contacts,
  connections,
  selectedContactId,
  onSelectContact,
  highlightedIds = [],
  exploringContact = null,
  onStopExploring,
  userLocation,
  showUserConnectionLines = true,
}: NetworkGlobeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [progress, setProgress] = useState([0])
  const [worldData, setWorldData] = useState<GeoFeature[]>([])
  const [rotation, setRotation] = useState([-40, -15])
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouse, setLastMouse] = useState([0, 0])
  const [zoomLevel, setZoomLevel] = useState(1)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const rafRef = useRef<number | null>(null)
  const rotationRef = useRef(rotation)
  const lastMouseRef = useRef(lastMouse)
  rotationRef.current = rotation
  lastMouseRef.current = lastMouse

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const { width, height } = dimensions

  useEffect(() => {
    const loadWorldData = async () => {
      try {
        const response = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
        const world: any = await response.json()
        const countries = feature(world, world.objects.countries).features
        setWorldData(countries)
      } catch {
        setWorldData([{
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]] },
          properties: {},
        }])
      }
    }
    loadWorldData()
  }, [])

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true)
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) {
      const pos: [number, number] = [event.clientX - rect.left, event.clientY - rect.top]
      setLastMouse(pos)
      lastMouseRef.current = pos
    }
  }, [])

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isDragging) return
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const currentMouse: [number, number] = [event.clientX - rect.left, event.clientY - rect.top]
      const [lx, ly] = lastMouseRef.current
      const dx = currentMouse[0] - lx
      const dy = currentMouse[1] - ly
      const sensitivity = progress[0] < 50 ? 0.5 : 0.25
      const [r0, r1] = rotationRef.current
      const nextRotation: [number, number] = [
        r0 + dx * sensitivity,
        Math.max(-90, Math.min(90, r1 - dy * sensitivity)),
      ]
      lastMouseRef.current = currentMouse
      rotationRef.current = nextRotation
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          setRotation(rotationRef.current)
          setLastMouse(lastMouseRef.current)
        })
      }
    },
    [isDragging, progress]
  )

  const handleMouseUp = () => setIsDragging(false)

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.1 : 0.1
    setZoomLevel((prev) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev + delta)))
  }, [])

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(ZOOM_MAX, prev + 0.25))
  }, [])

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(ZOOM_MIN, prev - 0.25))
  }, [])

  const resetView = useCallback(() => {
    setRotation([-40, -15])
    setZoomLevel(1)
    setProgress([0]) // Back to globe view (not unrolled map)
  }, [])

  useEffect(() => {
    if (!svgRef.current || worldData.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const t = progress[0] / 100
    const alpha = Math.pow(t, 0.5)
    const baseScale = d3.scaleLinear().domain([0, 1]).range([Math.min(width, height) * 0.4, Math.min(width, height) * 0.22])
    const scale = (a: number) => baseScale(a) * zoomLevel

    const projection = interpolateProjection(d3.geoOrthographicRaw, d3.geoEquirectangularRaw)
      .scale(scale(alpha))
      .translate([width / 2, height / 2])
      .rotate([rotation[0], rotation[1]])
      .precision(0.1)
    projection.alpha(alpha)

    const path = d3.geoPath(projection)

    // Graticule
    try {
      const graticule = d3.geoGraticule()
      const graticulePath = path(graticule())
      if (graticulePath) {
        svg.append("path").datum(graticule()).attr("d", graticulePath)
          .attr("fill", "none").attr("stroke", "#ffffff").attr("stroke-width", 0.4).attr("opacity", 0.06)
      }
    } catch {}

    // Countries
    svg.selectAll(".country").data(worldData).enter().append("path")
      .attr("class", "country")
      .attr("d", (d) => { try { const p = path(d as any); return (p && !p.includes("NaN")) ? p : "" } catch { return "" } })
      .attr("fill", "none").attr("stroke", "#ffffff").attr("stroke-width", 0.5).attr("opacity", 0.12)
      .style("visibility", function () { const p = d3.select(this).attr("d"); return p && p.length > 0 && !p.includes("NaN") ? "visible" : "hidden" })

    // Sphere outline
    try {
      const sphereOutline = path({ type: "Sphere" })
      if (sphereOutline) {
        svg.append("path").datum({ type: "Sphere" }).attr("d", sphereOutline)
          .attr("fill", "none").attr("stroke", "#ffffff").attr("stroke-width", 0.6).attr("opacity", 0.15)
      }
    } catch {}

    // Connection arcs
    const connectionLayer = svg.append("g").attr("class", "connections")
    connections.forEach((conn) => {
      const fromContact = contacts.find((c) => c.id === conn.from)
      const toContact = contacts.find((c) => c.id === conn.to)
      if (!fromContact || !toContact) return

      const source: [number, number] = [fromContact.location.lng, fromContact.location.lat]
      const target: [number, number] = [toContact.location.lng, toContact.location.lat]
      const isRelevant = selectedContactId === conn.from || selectedContactId === conn.to
      const sourceProjected = projection(source)
      const targetProjected = projection(target)
      if (!sourceProjected || !targetProjected) return

      if (t < 0.5) {
        const gd1 = d3.geoDistance(source, [-rotation[0], -rotation[1]])
        const gd2 = d3.geoDistance(target, [-rotation[0], -rotation[1]])
        if (gd1 > Math.PI / 2 && gd2 > Math.PI / 2) return
      }

      const interpolate = d3.geoInterpolate(source, target)
      const arcPoints: [number, number][] = []
      for (let i = 0; i <= 30; i++) arcPoints.push(interpolate(i / 30) as [number, number])

      const lineGenerator = d3.line<[number, number]>()
        .x((d) => { const p = projection(d); return p ? p[0] : 0 })
        .y((d) => { const p = projection(d); return p ? p[1] : 0 })
        .curve(d3.curveBasis)

      const arcPath = lineGenerator(arcPoints)
      if (!arcPath) return

      connectionLayer.append("path").attr("d", arcPath).attr("fill", "none")
        .attr("stroke", isRelevant ? "#E8A838" : "#ffffff")
        .attr("stroke-width", isRelevant ? 1.5 : 0.6)
        .attr("opacity", isRelevant ? 0.7 : 0.08)
        .attr("stroke-dasharray", isRelevant ? "none" : "2,3")
    })

    // User-to-contact connection arcs: only one blue line from selected person to "You"
    if (userLocation && showUserConnectionLines) {
      const userCoords: [number, number] = [userLocation.lng, userLocation.lat]
      const userProjected = projection(userCoords)
      if (userProjected) {
        const userIsSelected = selectedContactId === "me"
        // When a contact is selected, show only the one blue line from that contact to me (not all my lines)
        const contactsToDraw = userIsSelected
          ? contacts
          : selectedContactId
            ? contacts.filter((c) => c.id === selectedContactId)
            : contacts
        contactsToDraw.forEach((contact) => {
          const target: [number, number] = [contact.location.lng, contact.location.lat]
          const targetProjected = projection(target)
          if (!targetProjected) return
          if (t < 0.5) {
            const gd1 = d3.geoDistance(userCoords, [-rotation[0], -rotation[1]])
            const gd2 = d3.geoDistance(target, [-rotation[0], -rotation[1]])
            if (gd1 > Math.PI / 2 && gd2 > Math.PI / 2) return
          }
          const interpolate = d3.geoInterpolate(userCoords, target)
          const arcPoints: [number, number][] = []
          for (let i = 0; i <= 30; i++) arcPoints.push(interpolate(i / 30) as [number, number])
          const lineGenerator = d3.line<[number, number]>()
            .x((d) => { const p = projection(d); return p ? p[0] : 0 })
            .y((d) => { const p = projection(d); return p ? p[1] : 0 })
            .curve(d3.curveBasis)
          const arcPath = lineGenerator(arcPoints)
          if (!arcPath) return
          const isRelevant = userIsSelected || selectedContactId === contact.id
          connectionLayer.append("path").attr("d", arcPath).attr("fill", "none")
            .attr("stroke", isRelevant ? "#3B82F6" : "rgba(59, 130, 246, 0.25)")
            .attr("stroke-width", isRelevant ? 1.5 : 0.5)
            .attr("opacity", isRelevant ? 0.6 : 0.12)
            .attr("stroke-dasharray", isRelevant ? "none" : "3,4")
        })
      }
    }

    // Contact nodes
    const nodeLayer = svg.append("g").attr("class", "nodes")
    contacts.forEach((contact) => {
      const coords: [number, number] = [contact.location.lng, contact.location.lat]
      const projected = projection(coords)
      if (!projected) return

      if (t < 0.5) {
        const geoDistance = d3.geoDistance(coords, [-rotation[0], -rotation[1]])
        if (geoDistance > Math.PI / 2) return
      }

      const isSelected = selectedContactId === contact.id
      const isHighlighted = highlightedIds.includes(contact.id)
      const isActive = isSelected || isHighlighted
      const nodeColor = isSelected ? "#34D399" : isActive ? "#E8A838" : "#ffffff"

      const group = nodeLayer.append("g")
        .attr("transform", `translate(${projected[0]}, ${projected[1]})`)
        .attr("cursor", "pointer")
        .on("click", () => onSelectContact(contact.id))

      if (isActive) {
        group.append("circle").attr("r", 14).attr("fill", nodeColor).attr("opacity", 0.12)
      }

      group.append("circle")
        .attr("r", isActive ? 7 : 4.5)
        .attr("fill", isActive ? nodeColor : "#ffffff")
        .attr("opacity", isActive ? 1 : 0.55)
        .attr("stroke", isActive ? nodeColor : "none")
        .attr("stroke-width", isActive ? 2 : 0)

      if (isActive || t > 0.7) {
        group.append("text").attr("x", 10).attr("y", 4)
          .attr("font-size", isActive ? "11px" : "9px")
          .attr("font-family", "Inter, sans-serif")
          .attr("font-weight", isActive ? "600" : "400")
          .attr("fill", isActive ? nodeColor : "#888888")
          .text(contact.name)
      }
    })
    // User location dot (blue)
    if (userLocation) {
      const userCoords: [number, number] = [userLocation.lng, userLocation.lat]
      const userProjected = projection(userCoords)
      if (userProjected) {
        let showUser = true
        if (t < 0.5) {
          const geoDistance = d3.geoDistance(userCoords, [-rotation[0], -rotation[1]])
          if (geoDistance > Math.PI / 2) showUser = false
        }
        if (showUser) {
          const isSelected = selectedContactId === "me"
          const userGroup = nodeLayer.append("g")
            .attr("transform", `translate(${userProjected[0]}, ${userProjected[1]})`)
            .attr("cursor", "pointer")
            .style("pointer-events", "all")
            .on("click", () => onSelectContact("me"))

          // Selected ring when "me" is selected
          if (isSelected) {
            userGroup.append("circle").attr("r", 22).attr("fill", "none").attr("stroke", "#3B82F6").attr("stroke-width", 2).attr("opacity", 0.6)
          }
          // Outer pulse ring
          userGroup.append("circle").attr("r", 18).attr("fill", "#3B82F6").attr("opacity", isSelected ? 0.2 : 0.08)
          // Mid ring
          userGroup.append("circle").attr("r", 11).attr("fill", "#3B82F6").attr("opacity", isSelected ? 0.25 : 0.15)
          // Core dot
          userGroup.append("circle").attr("r", isSelected ? 8 : 6).attr("fill", "#3B82F6").attr("stroke", "#93C5FD").attr("stroke-width", isSelected ? 2.5 : 2)
          // Label
          userGroup.append("text").attr("x", 12).attr("y", 4)
            .attr("font-size", "10px")
            .attr("font-family", "Inter, sans-serif")
            .attr("font-weight", "700")
            .attr("fill", "#3B82F6")
            .text(userLocation.name)
        }
      }
    }

  }, [worldData, progress, rotation, contacts, connections, selectedContactId, highlightedIds, onSelectContact, width, height, zoomLevel, userLocation, showUserConnectionLines])

  const handleAnimate = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)
    const startProgress = progress[0]
    const endProgress = startProgress === 0 ? 100 : 0
    const duration = 2000
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      setProgress([startProgress + (endProgress - startProgress) * eased])
      if (t < 1) requestAnimationFrame(animate)
      else setIsAnimating(false)
    }
    animate()
  }, [isAnimating, progress])

  const isGlobe = progress[0] < 50

  return (
    <div ref={containerRef} className="relative flex flex-col w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      {/* Zoom controls - vertical stack on the right */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
        <button
          type="button"
          onClick={zoomIn}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-card text-foreground hover:bg-secondary cursor-pointer transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center w-8 h-5 text-[10px] text-muted-foreground font-mono">
          {Math.round(zoomLevel * 100)}%
        </div>
        <button
          type="button"
          onClick={zoomOut}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-card text-foreground hover:bg-secondary cursor-pointer transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-4 right-4 flex gap-2 z-10">
        <button
          type="button"
          onClick={handleAnimate}
          disabled={isAnimating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {isGlobe ? <><Map className="w-3.5 h-3.5" /> Unroll to Map</> : <><Globe className="w-3.5 h-3.5" /> Roll to Globe</>}
        </button>
        <button
          type="button"
          onClick={resetView}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
        >
          Reset
        </button>
      </div>
      {/* Exploring network banner */}
      {exploringContact && onStopExploring && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card/90 border border-primary/20 backdrop-blur-sm">
          <button
            type="button"
            onClick={onStopExploring}
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            aria-label="Back to your network"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Eye className="w-4 h-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              {"Exploring "}{exploringContact.name}{"'s network"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {exploringContact.networkVisibility === "public" ? "Public network" : "Shared with friends"}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
