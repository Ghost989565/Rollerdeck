"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import type { Contact, Connection } from "@/lib/data"

interface ConnectionGraphProps {
  contacts: Contact[]
  connections: Connection[]
  selectedContactId: string | null
  onSelectContact: (id: string) => void
  showUserNode?: boolean
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  initials: string
  company: string
  tags: string[]
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  relationship: string
}

export function ConnectionGraph({ contacts, connections, selectedContactId, onSelectContact, showUserNode = false }: ConnectionGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const selectedContactIdRef = useRef(selectedContactId)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  selectedContactIdRef.current = selectedContactId

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

  useEffect(() => {
    if (!svgRef.current) return

    const { width, height } = dimensions
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    simulationRef.current = null

    const nodes: SimNode[] = contacts.map((c) => ({
      id: c.id, name: c.name, initials: c.initials, company: c.company, tags: c.tags,
    }))
    if (showUserNode) {
      nodes.unshift({ id: "me", name: "You", initials: "You", company: "", tags: [] })
    }

    const links: SimLink[] = connections
      .filter((conn) => nodes.find((n) => n.id === conn.from) && nodes.find((n) => n.id === conn.to))
      .map((conn) => ({ source: conn.from, target: conn.to, relationship: conn.relationship }))
    if (showUserNode) {
      contacts.forEach((c) => links.push({ source: "me", target: c.id, relationship: "You" }))
    }

    const connectionCount = new Map<string, number>()
    connections.forEach((conn) => {
      connectionCount.set(conn.from, (connectionCount.get(conn.from) || 0) + 1)
      connectionCount.set(conn.to, (connectionCount.get(conn.to) || 0) + 1)
    })
    if (showUserNode) connectionCount.set("me", contacts.length)

    const selId = selectedContactIdRef.current
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40))

    simulationRef.current = simulation

    const defs = svg.append("defs")
    const filter = defs.append("filter").attr("id", "glow")
    filter.append("feGaussianBlur").attr("stdDeviation", 3).attr("result", "coloredBlur")
    const feMerge = filter.append("feMerge")
    feMerge.append("feMergeNode").attr("in", "coloredBlur")
    feMerge.append("feMergeNode").attr("in", "SourceGraphic")

    const link = svg.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke", (d: any) => (d.source.id === "me" || d.target.id === "me") ? "#3B82F6" : "#ffffff")
      .attr("stroke-opacity", (d: any) => (d.source.id === "me" || d.target.id === "me") ? 0.2 : 0.08)
      .attr("stroke-width", 1)

    const node = svg.append("g").selectAll("g").data(nodes).enter().append("g")
      .attr("cursor", "pointer")
      .on("click", (_, d) => onSelectContact(d.id))
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y })
          .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )

    const isUserNode = (d: SimNode) => d.id === "me"
    node.append("circle")
      .attr("class", "node-circle")
      .attr("r", (d) => 10 + (connectionCount.get(d.id) || 1) * 3)
      .attr("fill", (d) => {
        if (d.id === selId) return isUserNode(d) ? "#3B82F6" : "#E8A838"
        return isUserNode(d) ? "#3B82F6" : "rgba(26,26,26,0.9)"
      })
      .attr("stroke", (d) => d.id === selId ? (isUserNode(d) ? "#3B82F6" : "#E8A838") : (isUserNode(d) ? "#3B82F6" : "#ffffff"))
      .attr("stroke-width", (d) => d.id === selId ? 2 : 1)
      .attr("stroke-opacity", (d) => d.id === selId ? 1 : (isUserNode(d) ? 0.6 : 0.25))
      .attr("filter", (d) => d.id === selId ? "url(#glow)" : "none")

    node.append("text")
      .attr("class", "node-initials")
      .text((d) => d.initials)
      .attr("text-anchor", "middle").attr("dy", "0.35em")
      .attr("font-size", (d) => isUserNode(d) ? "8px" : "10px")
      .attr("font-weight", "600").attr("font-family", "Inter, sans-serif")
      .attr("fill", (d) => d.id === selId ? "#0F0F0F" : "#ffffff")
      .attr("fill-opacity", (d) => d.id === selId ? 1 : 0.6)

    node.append("text")
      .attr("class", "node-name")
      .text((d) => d.name.split(" ")[0])
      .attr("text-anchor", "middle")
      .attr("dy", (d) => 10 + (connectionCount.get(d.id) || 1) * 3 + 14)
      .attr("font-size", "9px").attr("font-family", "Inter, sans-serif")
      .attr("fill", (d) => d.id === selId ? (isUserNode(d) ? "#3B82F6" : "#E8A838") : (isUserNode(d) ? "#3B82F6" : "#666666"))

    simulation.on("tick", () => {
      const currentSel = selectedContactIdRef.current
      const linkHighlighted = (d: any) => currentSel && (d.source.id === currentSel || d.target.id === currentSel)
      const isUserLink = (d: any) => d.source.id === "me" || d.target.id === "me"
      link
        .attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y)
        .attr("stroke", (d: any) => linkHighlighted(d) ? (isUserLink(d) ? "#3B82F6" : "#E8A838") : (isUserLink(d) ? "#3B82F6" : "#ffffff"))
        .attr("stroke-opacity", (d: any) => linkHighlighted(d) ? 0.5 : (isUserLink(d) ? 0.2 : 0.08))
        .attr("stroke-width", (d: any) => linkHighlighted(d) ? 2 : 1)
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
      node.select(".node-circle")
        .attr("fill", (d: any) => {
          if (d.id === currentSel) return d.id === "me" ? "#3B82F6" : "#E8A838"
          return d.id === "me" ? "#3B82F6" : "rgba(26,26,26,0.9)"
        })
        .attr("stroke", (d: any) => d.id === currentSel ? (d.id === "me" ? "#3B82F6" : "#E8A838") : (d.id === "me" ? "#3B82F6" : "#ffffff"))
        .attr("stroke-width", (d: any) => d.id === currentSel ? 2 : 1)
        .attr("stroke-opacity", (d: any) => d.id === currentSel ? 1 : (d.id === "me" ? 0.6 : 0.25))
        .attr("filter", (d: any) => d.id === currentSel ? "url(#glow)" : "none")
      node.select(".node-initials")
        .attr("fill", (d: any) => d.id === currentSel ? "#0F0F0F" : "#ffffff")
        .attr("fill-opacity", (d: any) => d.id === currentSel ? 1 : 0.6)
      node.select(".node-name")
        .attr("fill", (d: any) => d.id === currentSel ? (d.id === "me" ? "#3B82F6" : "#E8A838") : (d.id === "me" ? "#3B82F6" : "#666666"))
    })

    return () => {
      simulation.stop()
      simulationRef.current = null
    }
  }, [contacts, connections, onSelectContact, dimensions, showUserNode])

  useEffect(() => {
    if (!simulationRef.current) return
    selectedContactIdRef.current = selectedContactId
    simulationRef.current.alpha(0.15).restart()
  }, [selectedContactId])

  return (
    <div ref={containerRef} className="w-full h-full touch-none select-none overflow-hidden">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full" />
    </div>
  )
}
