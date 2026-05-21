// components/heatmap/D3FoundationHeatmap.tsx
import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { Defect } from '../../types/api';

interface Props {
  defects: Defect[];
  selectedDefectId: string | null;
  onDefectClick: (defect: Defect) => void;
  tankDiameterM?: number;
  width?: number;
  height?: number;
}

const defectClassColor: Record<number, string> = { 1: '#22c55e', 2: '#f97316', 3: '#dc2626' };

export function D3FoundationHeatmap({
  defects, selectedDefectId, onDefectClick, width = 460, height = 460,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const draw = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) / 2 - 25;

    svg.append('defs').append('clipPath').attr('id', 'found-clip').append('circle').attr('cx', cx).attr('cy', cy).attr('r', R + 10);
    const g = svg.append('g');

    // Foundation Base Soil/Slab Pad Background
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', '#f8fafc').attr('stroke', '#cbd5e1').attr('stroke-width', 1);

    // Inner pad grid pattern simulation (sand/bitumen)
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R - 15).attr('fill', '#f1f5f9').attr('stroke', '#94a3b8').attr('stroke-width', 1).attr('stroke-dasharray', '4 4');
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R - 40).attr('fill', 'none').attr('stroke', '#cbd5e1').attr('stroke-dasharray', '4 4');

    // Thick Concrete Ring Wall Girder
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R - 7.5).attr('fill', 'none').attr('stroke', '#94a3b8').attr('stroke-width', 15);
    // Outer Ring Wall Edge
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'none').attr('stroke', '#64748b').attr('stroke-width', 1.5);

    const defectG = g.append('g').attr('clip-path', 'url(#found-clip)');

    defects.forEach((defect) => {
      // Corrected Mapping
      const dx = cx + (defect.nx - 0.5) * 2 * R;
      const dy = cy + (defect.ny - 0.5) * 2 * R;
      
      const color = defectClassColor[defect.eemua159Class] ?? '#64748b';
      const isSelected = defect.id === selectedDefectId;
      const r = defect.eemua159Class === 3 ? 10 : 6;

      if (isSelected) {
        defectG.append('circle')
          .attr('cx', dx).attr('cy', dy)
          .attr('r', r + 5)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2.5);
      }

      // Corrected: assigned dy variable properly instead of resetting to absolute cy center point
      defectG.append('circle')
        .attr('cx', dx).attr('cy', dy)
        .attr('r', r)
        .attr('fill', color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .on('click', () => onDefectClick(defect));

      if (defect.eemua159Class === 3) {
        defectG.append('text')
          .attr('x', dx).attr('y', dy + 3)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', 9)
          .attr('font-weight', 'bold')
          .attr('pointer-events', 'none')
          .text(defect.id);
      }
    });
  }, [defects, selectedDefectId, onDefectClick, width, height]);

  useEffect(() => { draw() }, [draw]);

  return <svg ref={svgRef} width={width} height={height} style={{ display: 'block', margin: '0 auto' }} />;
}