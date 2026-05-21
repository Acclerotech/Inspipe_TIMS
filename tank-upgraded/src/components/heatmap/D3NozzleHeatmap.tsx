// components/heatmap/D3NozzleHeatmap.tsx
import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { Defect } from '../../types/api';

interface Props {
  defects: Defect[];
  selectedDefectId: string | null;
  onDefectClick: (defect: Defect) => void;
  tankHeightM?: number;
  width?: number;
  height?: number;
}

const defectClassColor: Record<number, string> = { 1: '#22c55e', 2: '#f97316', 3: '#dc2626' };

export function D3NozzleHeatmap({
  defects, selectedDefectId, onDefectClick, tankHeightM = 15.0, width = 600, height = 300,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const draw = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Rectangular Shell Plane for penetrations
    g.append('rect').attr('width', innerWidth).attr('height', innerHeight)
      .attr('fill', '#f8fafc').attr('stroke', '#94a3b8').attr('stroke-width', 1);

    // Degree Guidelines
    for (let i = 0; i <= 12; i++) {
      const x = (innerWidth / 12) * i;
      g.append('line').attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', innerHeight)
        .attr('stroke', '#e2e8f0').attr('stroke-width', 1);
    }
    
    // Highlight common nozzle elevations (e.g. 1m from base)
    const baseDatumY = innerHeight - (1.0 / tankHeightM) * innerHeight;
    g.append('line').attr('x1', 0).attr('y1', baseDatumY).attr('x2', innerWidth).attr('y2', baseDatumY)
      .attr('stroke', '#94a3b8').attr('stroke-width', 2).attr('stroke-dasharray', '8 4');

    const xScale = d3.scaleLinear().domain([0, 360]).range([0, innerWidth]);
    const xAxis = d3.axisBottom(xScale).tickValues([0, 90, 180, 270, 360]).tickFormat(d => `${d}°`);
    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(xAxis).call(g => g.select('.domain').remove());

    const yScale = d3.scaleLinear().domain([0, tankHeightM]).range([innerHeight, 0]);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}m`);
    g.append('g').call(yAxis).call(g => g.select('.domain').remove());

    defects.forEach((defect) => {
      const dx = defect.nx * innerWidth;
      const dy = defect.ny * innerHeight;
      const color = defectClassColor[defect.eemua159Class] ?? '#64748b';
      const isSelected = defect.id === selectedDefectId;
      const r = defect.eemua159Class === 3 ? 12 : 6;

      if (isSelected) g.append('circle').attr('cx', dx).attr('cy', dy).attr('r', r + 4).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2);

      // Nozzles use square markers instead of circles to differentiate them from shell defects
      g.append('rect').attr('x', dx - r).attr('y', dy - r).attr('width', r*2).attr('height', r*2)
        .attr('fill', color).attr('stroke', '#ffffff').attr('stroke-width', 1.5).attr('cursor', 'pointer')
        .on('click', () => onDefectClick(defect));

      if (defect.eemua159Class === 3) {
        g.append('text').attr('x', dx).attr('y', dy - 10).attr('text-anchor', 'middle').attr('fill', color).attr('font-size', 10).attr('font-weight', 'bold').text(defect.id);
      }
    });
  }, [defects, selectedDefectId, onDefectClick, tankHeightM, width, height]);

  useEffect(() => { draw() }, [draw]);

  return <svg ref={svgRef} width={width} height={height} style={{ display: 'block', margin: '0 auto' }} />;
}