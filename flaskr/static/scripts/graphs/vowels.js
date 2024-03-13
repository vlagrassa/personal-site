export function graph_svg_vowels(data) {

  const width  = 500;
  const margin = 50;
  const corner = width * 0.3;

  const outline_color = 'gray';

  // Create the SVG container
  const svg = d3.create("svg")
      .attr("width",  '100%')
      .attr("height", '100%')
      .attr("viewBox", `0 0 ${width} ${width}`)
      .style("font-size", "10px")

  const scale_y = d3.scaleLinear().domain([0, 1]).range([width - margin, margin])
  const x_offset = d3.scaleLinear().domain([0, 1]).range([corner, 0])

  const map_pt_y = function({x, y}) {
    return scale_y(y)
  }

  const map_pt_x = function({x, y}) {
    return d3.scaleLinear().domain([0, 1]).range([margin + x_offset(y), width - margin])(x)
  }

  const draw_line = d3.line()
      .x( (d) => map_pt_x(d) )
      .y( (d) => map_pt_y(d) )

  function draw_path(points, closed=false, pathtype='path') {
    return svg.append(pathtype)
        .attr("d", draw_line(points) + (closed ? 'Z' : ''))
        .style("fill", "none")
        .style("stroke", outline_color);
  }


  draw_path([ { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 0 } ], true)
  draw_path([ { x: 0.5, y: 0 }, { x: 0.5, y: 1 } ])
  draw_path([ { x: 0, y: 0.33 }, { x: 1, y: 0.33 } ])
  draw_path([ { x: 0, y: 0.66 }, { x: 1, y: 0.66 } ])

  add_labels(svg)
      .attr("x", d => map_pt_x(d) - (d.side == 'l' ? 20 : 0))
      .attr("y", d => map_pt_y(d) - (d.side == 't' ? 20 : 0))

  return svg;
}



/* Helpers */

const labels = [
  { label: 'Close',     x: 0,   y: 1,    side: 'l' },
  { label: 'Close-Mid', x: 0,   y: 0.66, side: 'l' },
  { label: 'Open-Mid',  x: 0,   y: 0.33, side: 'l' },
  { label: 'Open',      x: 0,   y: 0,    side: 'l' },
  { label: 'Front',     x: 0,   y: 1,    side: 't' },
  { label: 'Central',   x: 0.5, y: 1,    side: 't' },
  { label: 'Back',      x: 1,   y: 1,    side: 't' },
]

function add_labels(svg) {
  return svg.append("g")
      .attr("fill", "gray")
      .attr("font-size", "1.5em")
    .selectAll("text")
    .data(labels)
    .join("text")
      .attr('text-anchor', d => d.side == 'l' ? 'end' : 'middle')
      .attr('dominant-baseline', 'middle')
      .text(d => d.label)
      .attr("pointer-events", "none")
}
