import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function LossChart({ lossHistory }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const el = svgRef.current;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;

      const margin = { top: 12, right: 12, bottom: 32, left: 44 };
      const W = width  - margin.left - margin.right;
      const H = height - margin.top  - margin.bottom;

    d3.select(el).selectAll('*').remove();

    const svg = d3.select(el)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    if (!lossHistory || lossHistory.length < 2) {
      svg.append('text')
        .attr('x', W / 2).attr('y', H / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'hsl(0,0%,35%)')
        .attr('font-size', '12px')
        .attr('font-family', 'Inter, sans-serif')
        .text('Loss curve will appear here during training');
      return;
    }

    const data = lossHistory;
    const xScale = d3.scaleLinear()
      .domain([data[0].step, data[data.length - 1].step])
      .range([0, W]);

    const yMax = d3.max(data, (d) => d.loss) * 1.05;
    const yMin = Math.max(0, d3.min(data, (d) => d.loss) * 0.95);
    const yScale = d3.scaleLinear()
      .domain([yMax, yMin])
      .range([0, H]);

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale).ticks(5).tickSize(-W).tickFormat('')
      )
      .selectAll('line')
      .attr('stroke', 'hsl(0,0%,18%)')
      .attr('stroke-dasharray', '3,4');
    svg.select('.grid .domain').remove();

    // Gradient area
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'lossGrad')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', H);
    grad.append('stop').attr('offset', '0%').attr('stop-color', 'hsl(210,100%,60%)').attr('stop-opacity', 0.25);
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'hsl(210,100%,60%)').attr('stop-opacity', 0);

    const area = d3.area()
      .x((d) => xScale(d.step))
      .y0(H)
      .y1((d) => yScale(d.loss))
      .curve(d3.curveCatmullRom);

    svg.append('path')
      .datum(data)
      .attr('fill', 'url(#lossGrad)')
      .attr('d', area);

    // Line
    const line = d3.line()
      .x((d) => xScale(d.step))
      .y((d) => yScale(d.loss))
      .curve(d3.curveCatmullRom);

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'hsl(210,100%,60%)')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Latest point
    const last = data[data.length - 1];
    svg.append('circle')
      .attr('cx', xScale(last.step))
      .attr('cy', yScale(last.loss))
      .attr('r', 4)
      .attr('fill', 'hsl(210,100%,60%)')
      .attr('stroke', 'hsl(0,0%,6%)')
      .attr('stroke-width', 2);

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('d')))
      .selectAll('text, line, path')
      .attr('stroke', 'hsl(0,0%,30%)')
      .attr('fill', 'hsl(0,0%,40%)')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif');
    svg.select('.domain').attr('stroke', 'hsl(0,0%,20%)');

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.3f')))
      .selectAll('text, line, path')
      .attr('stroke', 'hsl(0,0%,30%)')
      .attr('fill', 'hsl(0,0%,40%)')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif');

    // Axis labels
    svg.append('text')
      .attr('x', W / 2).attr('y', H + 28)
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(0,0%,40%)')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif')
      .text('Step');

      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -H / 2).attr('y', -34)
        .attr('text-anchor', 'middle')
        .attr('fill', 'hsl(0,0%,40%)')
        .attr('font-size', '10px')
        .attr('font-family', 'Inter, sans-serif')
        .text('Loss');
    };

    const ro = new ResizeObserver(update);
    ro.observe(el.parentElement);
    update();

    return () => ro.disconnect();
  }, [lossHistory]);

  return (
    <div className="loss-chart-wrap" style={{ minWidth: 0, overflow: 'hidden' }}>
      <div className="flex ai-c jc-sb" style={{ marginBottom: 8 }}>
        <span className="text-xs text-muted" style={{ fontWeight: 500 }}>Loss Curve</span>
        {lossHistory?.length > 0 && (
          <span className="badge badge-accent text-xs">
            {lossHistory.length} points
          </span>
        )}
      </div>
      <svg ref={svgRef} width="100%" height="140" />
    </div>
  );
}
