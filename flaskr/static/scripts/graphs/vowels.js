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

  // Create container for definitions
  const defs = svg.append('defs');

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

  function append_path(target, points, closed=false) {
    return target
      .append('path')
        .attr("d", draw_line(points) + (closed ? 'Z' : ''))
        .style("fill", "none")
        .style("stroke", outline_color);
  }


  // Create a clip path for the trapezoid boundary
  append_path(defs.append('clipPath').attr('id', 'trap-boundary'),     TRAP_OUTLINE,          true);
  append_path(defs.append('clipPath').attr('id', 'trap-boundary-ext'), TRAP_OUTLINE_EXTENDED, true);


  function mouseover(event, p) {
    const target = symbols.nodes()[event.target.dataset.index];
    target.classList.add('active');
    target.textContent = p.word;
  }

  function mouseout(event, p) {
    const target = symbols.nodes()[event.target.dataset.index];
    target.classList.remove('active');
    target.textContent = p.symbol;
  }

  // Compute voronoi diagram for the vowels
  const delaunay = d3.Delaunay.from(data.map(d => [map_pt_x(d), map_pt_y(d)]));
  const voronoi  = delaunay.voronoi([0, 0, width, width]);

  // Create interactive voronoi regions inside trapezoid, extending over the edges a bit
  const regions = svg.append("g")
      .attr('id', 'voronoi')
      .attr('clip-path', "url(#trap-boundary-ext)")
    .selectAll("path")
    .data(data)
    .join("path")
      .attr("fill", "transparent")
      .attr("d", (d, i) => voronoi.renderCell(i))
      .attr("data-index", (d, i) => i)
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)

  // // Create display boundaries for voronoi regions, clipped exactly at the edges
  // svg.append("g")
  //     .attr('clip-path', "url(#trap-boundary)")
  //   .selectAll("path")
  //   .data(data)
  //   .join("path")
  //     .attr("fill", "transparent")
  //     .attr('stroke', 'lightgray')
  //     .attr("d", (d, i) => voronoi.renderCell(i))
  //     .attr("pointer-events", "none")

  // Draw trapezoid
  append_path(svg, TRAP_OUTLINE, true).attr("pointer-events", "none");
  TRAP_LINES.forEach(line => append_path(svg, line).attr("pointer-events", "none"));

  // Draw background labels
  add_labels(svg)
      .attr("x", d => map_pt_x(d) - (d.side == 'l' ? 20 : 0))
      .attr("y", d => map_pt_y(d) - (d.side == 't' ? 20 : 0))

  // Draw IPA symbols
  const symbols = svg.append("g")
      .attr("font-size", "2.5em")
    .selectAll("text")
    .data(data)
    .join("text")
      .text(d => d.symbol)
      .attr('paint-order', 'stroke')
      .attr('stroke-width', '2px')
      .attr('stroke', 'white')
      .attr('class', 'vowel')
      .attr("x", d => map_pt_x(d))
      .attr("y", d => map_pt_y(d))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('pointer-events', 'none')

  // Return the SVG element
  return svg;
}



/* Helpers */

const TRAP_OUTLINE_EXTENDED = [ { x: -0.1, y: 1.1 }, { x: 1.1, y: 1.1 }, { x: 1.1, y: -0.1 }, { x: -0.1, y: -0.1 } ];

const TRAP_OUTLINE = [ { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 0 } ];
const TRAP_LINES = [
  [ { x: 0.5, y: 0    }, { x: 0.5, y: 1    } ],
  [ { x: 0,   y: 0.33 }, { x: 1,   y: 0.33 } ],
  [ { x: 0,   y: 0.66 }, { x: 1,   y: 0.66 } ],
];


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
