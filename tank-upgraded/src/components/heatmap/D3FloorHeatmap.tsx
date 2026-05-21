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

// ─── Color Scale (Matched to image) ───────────────────────────────────────────

const wallLossColor = d3
  .scaleLinear<string>()
  .domain([0, 0.1, 0.25, 0.5, 1.0])
  .range(['#93c5fd', '#86efac', '#fde047', '#ef4444', '#b91c1c']) // Light Blue, Green, Yellow, Red
  .clamp(true)

const defectClassColor: Record<number, string> = {
  1: '#22c55e', // Green
  2: '#f97316', // Orange
  3: '#dc2626', // Red
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
    const R = Math.min(width, height) / 2 - 25 // Slightly more padding for labels

    // ── Clip path (circular floor boundary) ───────────────────────────────────
    svg.append('defs')
      .append('clipPath')
      .attr('id', 'floor-clip')
      .append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', R)

    const g = svg.append('g')

    // ── Base circle (White background like image) ─────────────────────────────
    g.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', R)
      .attr('fill', '#ffffff')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)

    // ── Heat blobs from readings ───────────────────────────────────────────────
    const blobG = g.append('g').attr('clip-path', 'url(#floor-clip)')
    
    if (readings.length > 0) {
      readings.forEach((reading) => {
        const angleRad = (reading.angle - 90) * (Math.PI / 180)
        const r = reading.radius * R
        const bx = cx + r * Math.cos(angleRad)
        const by = cy + r * Math.sin(angleRad)
        const blobR = Math.max(16, R * 0.06)

        const grad = svg.select('defs')
          .append('radialGradient')
          .attr('id', `blob-${reading.angle}-${reading.radius.toFixed(2)}`)
          .attr('cx', '50%').attr('cy', '50%').attr('r', '50%')

        const color = wallLossColor(reading.wallLossPct / 100)
        grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.9)
        grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0)

        blobG.append('circle')
          .attr('cx', bx).attr('cy', by)
          .attr('r', blobR)
          .attr('fill', `url(#blob-${reading.angle}-${reading.radius.toFixed(2)})`)
      })
    } else {
      // Smoother synthetic blobs to mimic the image's continuous heatmap
      const syntheticBlobs = [
        { nx: 0.38, ny: 0.42, v: 0.88 }, { nx: 0.35, ny: 0.28, v: 0.80 },
        { nx: 0.52, ny: 0.63, v: 0.76 }, { nx: 0.25, ny: 0.25, v: 0.60 },
        { nx: 0.62, ny: 0.56, v: 0.44 }, { nx: 0.72, ny: 0.70, v: 0.33 },
        { nx: 0.45, ny: 0.80, v: 0.28 }, { nx: 0.20, ny: 0.40, v: 0.38 },
        { nx: 0.56, ny: 0.24, v: 0.28 }, { nx: 0.80, ny: 0.45, v: 0.40 },
        { nx: 0.15, ny: 0.65, v: 0.30 }, { nx: 0.40, ny: 0.20, v: 0.45 },
      ]
      
      // First pass: add a very light blue base to mimic 0-10% loss everywhere
      blobG.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', '#e0f2fe').attr('opacity', 0.5)

      syntheticBlobs.forEach((hs, i) => {
        const bx = cx + (hs.nx - 0.5) * 2 * R
        const by = cy + (hs.ny - 0.5) * 2 * R
        const blobR = R * 0.25 // Larger radius for smoother blending
        const gid = `synthetic-${i}`
        const grad = svg.select('defs').append('radialGradient')
          .attr('id', gid).attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
        const color = wallLossColor(hs.v)
        grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.95)
        grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0)
        blobG.append('circle')
          .attr('cx', bx).attr('cy', by).attr('r', blobR)
          .attr('fill', `url(#${gid})`)
      })
    }

    // ── Grid overlay (Light blue like image) ──────────────────────────────────
    const gridG = g.append('g').attr('clip-path', 'url(#floor-clip)')
    const gridN = 18 // Finer grid
    for (let i = 0; i <= gridN; i++) {
      const x = cx - R + ( (2*R) / gridN) * i
      const y = cy - R + ( (2*R) / gridN) * i
      gridG.append('line').attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', height)
        .attr('stroke', '#bae6fd').attr('stroke-width', 1)
      gridG.append('line').attr('x1', 0).attr('y1', y).attr('x2', width).attr('y2', y)
        .attr('stroke', '#bae6fd').attr('stroke-width', 1)
    }

    // Concentric rings (Light blue)
    ;[0.25, 0.5, 0.75, 1.0].forEach(fraction => {
      g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', R * fraction)
        .attr('fill', 'none').attr('stroke', '#bae6fd').attr('stroke-width', 1)
    })

    // ── Cardinal labels (Bold Black) ──────────────────────────────────────────
    const cardG = g.append('g')
    ;[
      { label: 'N', x: cx, y: cy - R - 6, anchor: 'middle' },
      { label: 'S', x: cx, y: cy + R + 14, anchor: 'middle' },
      { label: 'W', x: cx - R - 6, y: cy + 4, anchor: 'end' },
      { label: 'E', x: cx + R + 6, y: cy + 4, anchor: 'start' },
    ].forEach(({ label, x, y, anchor }) => {
      cardG.append('text')
        .attr('x', x).attr('y', y)
        .attr('text-anchor', anchor as CanvasTextAlign)
        .attr('fill', '#0f172a') // Slate-900 (almost black)
        .attr('font-size', 14)
        .attr('font-weight', 'bold')
        .attr('font-family', 'system-ui, sans-serif')
        .text(label)
    })

    // ── Defect markers (With white borders) ───────────────────────────────────
    const floorDefects = defects.filter((d) => d.component === 'FLOOR')
    const defectG = g.append('g').attr('clip-path', 'url(#floor-clip)')

    floorDefects.forEach((defect) => {
      const dx = cx + (defect.nx - 0.5) * 2 * R
      const dy = cy + (defect.ny - 0.5) * 2 * R
      const color = defectClassColor[defect.eemua159Class] ?? '#64748b'
      const isSelected = defect.id === selectedDefectId
      // Class 3 gets larger circles to fit text, others are small dots
      const r = defect.eemua159Class === 3 ? 12 : 5 

      // Selection Ring
      if (isSelected) {
        defectG.append('circle')
          .attr('cx', dx).attr('cy', dy).attr('r', r + 4)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
      }

      // Main circle
      defectG.append('circle')
        .attr('cx', dx).attr('cy', dy).attr('r', r)
        .attr('fill', color)
        .attr('stroke', '#ffffff') // White border like the image
        .attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .on('click', () => onDefectClick(defect))

      // Label (Only for large Class 3 defects like in the image)
      if (defect.eemua159Class === 3) {
        defectG.append('text')
          .attr('x', dx).attr('y', dy + 3)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', 9)
          .attr('font-weight', 'bold')
          .attr('font-family', 'system-ui, sans-serif')
          .attr('pointer-events', 'none')
          .text(defect.id)
      }
    })

  }, [readings, defects, selectedDefectId, onDefectClick, tankDiameterM, width, height])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ cursor: 'crosshair', display: 'block', margin: '0 auto' }}
      aria-label="Tank floor heatmap"
    />
  )
}

// ─── Time Slider (Unchanged logic, styled for light mode) ─────────────────────

interface TimeSliderProps {
  datasets: Array<{ id: string; label: string; date: string }>
  selectedIndex: number
  onChange: (index: number) => void
}

export function HeatmapTimeSlider({ datasets, selectedIndex, onChange }: TimeSliderProps) {
  if (datasets.length === 0) return null

  return (
    <div className="tims-card p-4">
      <div className="relative flex items-center px-2 mb-3">
        {/* Track */}
        <div className="absolute left-6 right-6 h-[2px] bg-slate-200" />
        {/* Ticks + labels */}
        <div className="relative w-full flex justify-between">
          {datasets.map((ds, i) => (
            <button
              key={ds.id}
              onClick={() => onChange(i)}
              className="flex flex-col items-center gap-2 relative z-10"
              title={ds.label}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all bg-white ${
                  i === selectedIndex
                    ? 'border-blue-600 scale-125'
                    : 'border-slate-300'
                }`}
              />
              <span
                className={`text-[10px] ${
                  i === selectedIndex ? 'text-blue-600 font-bold' : 'text-slate-500'
                }`}
              >
                {new Date(ds.date).getFullYear()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Legend (Matched to updated colors) ───────────────────────────────────────

export function HeatmapLegend() {
  return (
    <div className="px-2 pb-2 flex flex-wrap items-center justify-between gap-4 pt-2">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-slate-700">Wall Loss (% of nominal):</span>
        {[
          { color: '#93c5fd', label: '0–10%' },
          { color: '#86efac', label: '10–25%' },
          { color: '#fde047', label: '25–50%' },
          { color: '#ef4444', label: '>50%' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <div className="w-4 h-4 rounded-sm" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-slate-700">Defect Severity (EEMUA 159):</span>
        {[
          { color: '#22c55e', label: 'Class 1 (Low)' },
          { color: '#f97316', label: 'Class 2 (Medium)' },
          { color: '#dc2626', label: 'Class 3 (High)' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
