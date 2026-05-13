import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type { Defect } from '../../types/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeatmapReading {
  angle: number      // 0–360 degrees
  radius: number     // 0–1 normalised
  wallLossPct: number
  thicknessMm: number
  isBelowRetirement: boolean
}

interface Props {
  readings: HeatmapReading[]
  defects: Defect[]
  selectedDefectId: string | null
  onDefectClick: (defect: Defect) => void
  tankDiameterM?: number
  width?: number
  height?: number
}

// ─── Color Scale ──────────────────────────────────────────────────────────────

const wallLossColor = d3
  .scaleLinear<string>()
  .domain([0, 0.1, 0.25, 0.5, 1.0])
  .range(['#1e3a8a', '#16a34a', '#ca8a04', '#dc2626', '#7f1d1d'])
  .clamp(true)

const defectClassColor: Record<number, string> = {
  1: '#4ade80',
  2: '#fb923c',
  3: '#ef4444',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function D3FloorHeatmap({
  readings,
  defects,
  selectedDefectId,
  onDefectClick,
  tankDiameterM = 42,
  width = 460,
  height = 460,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const draw = useCallback(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const cx = width / 2
    const cy = height / 2
    const R = Math.min(width, height) / 2 - 20

    // ── Clip path (circular floor boundary) ───────────────────────────────────
    svg.append('defs')
      .append('clipPath')
      .attr('id', 'floor-clip')
      .append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', R)

    const g = svg.append('g')

    // ── Base circle ───────────────────────────────────────────────────────────
    g.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', R)
      .attr('fill', '#1e3a6e')
      .attr('stroke', '#3b5268')
      .attr('stroke-width', 1.5)

    // ── Heat blobs from readings ───────────────────────────────────────────────
    if (readings.length > 0) {
      const blobG = g.append('g').attr('clip-path', 'url(#floor-clip)')

      readings.forEach((reading) => {
        const angleRad = (reading.angle - 90) * (Math.PI / 180)
        const r = reading.radius * (R - 20)
        const bx = cx + r * Math.cos(angleRad)
        const by = cy + r * Math.sin(angleRad)
        const blobR = Math.max(12, R * 0.04)

        const grad = svg.select('defs')
          .append('radialGradient')
          .attr('id', `blob-${reading.angle}-${reading.radius.toFixed(2)}`)
          .attr('cx', '50%').attr('cy', '50%').attr('r', '50%')

        const color = wallLossColor(reading.wallLossPct / 100)
        grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.8)
        grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0)

        blobG.append('circle')
          .attr('cx', bx).attr('cy', by)
          .attr('r', blobR)
          .attr('fill', `url(#blob-${reading.angle}-${reading.radius.toFixed(2)})`)
      })
    } else {
      // Render synthetic heatmap blobs when no readings available (API loading state)
      const syntheticBlobs = [
        { nx: 0.38, ny: 0.42, v: 0.88 }, { nx: 0.35, ny: 0.28, v: 0.80 },
        { nx: 0.52, ny: 0.63, v: 0.76 }, { nx: 0.25, ny: 0.55, v: 0.48 },
        { nx: 0.62, ny: 0.56, v: 0.44 }, { nx: 0.72, ny: 0.70, v: 0.33 },
        { nx: 0.45, ny: 0.80, v: 0.28 }, { nx: 0.20, ny: 0.40, v: 0.38 },
        { nx: 0.56, ny: 0.24, v: 0.28 },
      ]
      const blobG = g.append('g').attr('clip-path', 'url(#floor-clip)')
      syntheticBlobs.forEach((hs, i) => {
        const bx = cx + (hs.nx - 0.5) * 2 * (R - 10)
        const by = cy + (hs.ny - 0.5) * 2 * (R - 10)
        const blobR = R * 0.14
        const gid = `synthetic-${i}`
        const grad = svg.select('defs').append('radialGradient')
          .attr('id', gid).attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
        const color = wallLossColor(hs.v)
        grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.85)
        grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0)
        blobG.append('circle')
          .attr('cx', bx).attr('cy', by).attr('r', blobR)
          .attr('fill', `url(#${gid})`)
      })
    }

    // ── Grid overlay ──────────────────────────────────────────────────────────
    const gridG = g.append('g')
      .attr('clip-path', 'url(#floor-clip)')
      .attr('opacity', 0.06)
    const gridN = 12
    for (let i = 0; i <= gridN; i++) {
      const x = (width / gridN) * i
      const y = (height / gridN) * i
      gridG.append('line').attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', height)
        .attr('stroke', '#fff').attr('stroke-width', 0.5)
      gridG.append('line').attr('x1', 0).attr('y1', y).attr('x2', width).attr('y2', y)
        .attr('stroke', '#fff').attr('stroke-width', 0.5)
    }

    // Concentric rings
    ;[0.25, 0.5, 0.75, 1.0].forEach(fraction => {
      g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', R * fraction)
        .attr('fill', 'none').attr('stroke', '#ffffff').attr('stroke-width', 0.4).attr('opacity', 0.1)
    })

    // ── Cardinal labels ───────────────────────────────────────────────────────
    const cardG = g.append('g')
    ;[
      { label: 'N', x: cx, y: 12, anchor: 'middle' },
      { label: 'S', x: cx, y: height - 4, anchor: 'middle' },
      { label: 'W', x: 8, y: cy + 4, anchor: 'start' },
      { label: 'E', x: width - 8, y: cy + 4, anchor: 'end' },
    ].forEach(({ label, x, y, anchor }) => {
      cardG.append('text')
        .attr('x', x).attr('y', y)
        .attr('text-anchor', anchor as CanvasTextAlign)
        .attr('fill', '#94a3b8')
        .attr('font-size', 11)
        .attr('font-weight', 'bold')
        .attr('font-family', 'system-ui, sans-serif')
        .text(label)
    })

    // ── Defect markers ────────────────────────────────────────────────────────
    const floorDefects = defects.filter((d) => d.component === 'FLOOR')
    const defectG = g.append('g').attr('clip-path', 'url(#floor-clip)')

    floorDefects.forEach((defect) => {
      const dx = cx + (defect.nx - 0.5) * 2 * (R - 22)
      const dy = cy + (defect.ny - 0.5) * 2 * (R - 22)
      const color = defectClassColor[defect.eemua159Class] ?? '#64748b'
      const isSelected = defect.id === selectedDefectId
      const r = defect.radiusPx ?? 14

      // Outer glow for selected
      if (isSelected) {
        defectG.append('circle')
          .attr('cx', dx).attr('cy', dy).attr('r', r + 6)
          .attr('fill', color)
          .attr('opacity', 0.2)
      }

      // Main circle
      defectG.append('circle')
        .attr('cx', dx).attr('cy', dy).attr('r', r)
        .attr('fill', color)
        .attr('fill-opacity', isSelected ? 0.45 : 0.25)
        .attr('stroke', color)
        .attr('stroke-width', isSelected ? 2.5 : 1.8)
        .attr('cursor', 'pointer')
        .on('click', () => onDefectClick(defect))
        .on('mouseenter', function () {
          d3.select(this).attr('fill-opacity', 0.6).attr('stroke-width', 3)
        })
        .on('mouseleave', function () {
          d3.select(this)
            .attr('fill-opacity', isSelected ? 0.45 : 0.25)
            .attr('stroke-width', isSelected ? 2.5 : 1.8)
        })

      // Label
      defectG.append('text')
        .attr('x', dx).attr('y', dy + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', 9)
        .attr('font-weight', 'bold')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('pointer-events', 'none')
        .text(defect.id)
    })

    // ── Diameter label ────────────────────────────────────────────────────────
    g.append('text')
      .attr('x', cx).attr('y', height - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', 9)
      .attr('font-family', 'system-ui, sans-serif')
      .text(`Ø ${tankDiameterM}m floor plan`)

  }, [readings, defects, selectedDefectId, onDefectClick, tankDiameterM, width, height])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ cursor: 'crosshair', display: 'block' }}
      aria-label="Tank floor heatmap — click defect markers for details"
    />
  )
}

// ─── Time Slider ──────────────────────────────────────────────────────────────
// AT-071: time slider for comparison between survey dates

interface TimeSliderProps {
  datasets: Array<{ id: string; label: string; date: string }>
  selectedIndex: number
  onChange: (index: number) => void
}

export function HeatmapTimeSlider({ datasets, selectedIndex, onChange }: TimeSliderProps) {
  if (datasets.length === 0) return null

  return (
    <div className="card">
      <p className="section-title">Time slider — compare inspections</p>
      <div className="relative flex items-center px-2 mb-3">
        {/* Track */}
        <div className="absolute left-6 right-6 h-0.5 bg-[#1e2530]" />
        {/* Ticks + labels */}
        <div className="relative w-full flex justify-between">
          {datasets.map((ds, i) => (
            <button
              key={ds.id}
              onClick={() => onChange(i)}
              className="flex flex-col items-center gap-1.5 relative z-10"
              title={ds.label}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  i === selectedIndex
                    ? 'bg-red-500 border-red-400 scale-125'
                    : 'bg-blue-500 border-blue-600'
                }`}
              />
              <span
                className={`text-[10px] ${
                  i === selectedIndex ? 'text-red-400 font-bold' : 'text-slate-500'
                }`}
              >
                {new Date(ds.date).getFullYear()}
              </span>
            </button>
          ))}
        </div>
      </div>
      {datasets[selectedIndex] && (
        <div className="bg-[#0d1117] border border-[#1e2530] rounded px-2.5 py-2 text-[11px] text-slate-400">
          Viewing: <span className="text-slate-200 font-medium">{datasets[selectedIndex].label}</span>
          <span className="text-slate-600 ml-2">· {datasets[selectedIndex].date}</span>
        </div>
      )}
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

export function HeatmapLegend() {
  return (
    <div className="px-4 pb-3 border-t border-[#1e2530] flex flex-wrap gap-4 pt-2.5">
      <span className="text-[11px] text-slate-500 self-center">Wall loss (% of nominal):</span>
      {[
        { color: '#1e40af', label: '0–10%' },
        { color: '#16a34a', label: '10–25%' },
        { color: '#ca8a04', label: '25–50%' },
        { color: '#dc2626', label: '>50%' },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <div className="w-3.5 h-3.5 rounded-sm" style={{ background: color }} />
          {label}
        </div>
      ))}
      <div className="ml-2 flex gap-4">
        {[
          { color: '#4ade80', label: 'Class-1 defect' },
          { color: '#fb923c', label: 'Class-2 defect' },
          { color: '#ef4444', label: 'Class-3 defect' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
