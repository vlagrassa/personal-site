/* Constants */

// First formant range
const F1_MIN = 100;
const F1_MAX = 900;

// Second formant range
const F2_MIN = 300;
const F2_MID = 2100;
const F2_MAX = 2700;



export function graph_svg_vowels(container, data) {

  const width  = 400;
  const margin = 40;

  // Compute how far in the bottom-left corner goes,
  // in terms of the graph width
  const corner = (F2_MAX - F2_MID) / (F2_MAX - F2_MIN) * (width - (2*margin));

  // Map formant values to Cartesian coordinates
  const scaleF1 = d3.scaleLinear().domain([F1_MIN, F1_MAX]).range([margin, width - margin])
  const scaleF2 = d3.scaleLinear().domain([F2_MIN, F2_MAX]).range([width - margin, margin])

  // Create the SVG container
  const svg = d3.create("svg")
      .attr("width",  '100%')
      .attr("height", '100%')
      .attr("viewBox", `0 0 ${width} ${width}`)
      .style("font-size", "10px")
      .attr("class", "graph-vowels")

  // Create container for definitions
  const defs = svg.append('defs');


  // Trapezoid coordinates

  const scale_y = d3.scaleLinear().domain([0, 1]).range([width - margin, margin])
  const x_offset = d3.scaleLinear().domain([0, 1]).range([corner, 0])

  const scaleTrapY = function({x, y}) {
    return scale_y(y)
  }

  const scaleTrapX = function({x, y}) {
    return d3.scaleLinear().domain([0, 1]).range([margin + x_offset(y), width - margin])(x)
  }

  // Mapping functions to convert points to our coordinate scheme

  function mapPointsFormants(points) {
    return points.map(([f1, f2]) => [scaleF2(f2), scaleF1(f1)])
  }

  function mapPointsTrapezoid(points) {
    // return points.map(([x, y]) => [scaleTrapX(x), scaleTrapY(y)])
    return points.map((pt) => [scaleTrapX(pt), scaleTrapY(pt)])
  }

  const draw_line = d3.line()
      .x( (d) => scaleTrapX(d) )
      .y( (d) => scaleTrapY(d) )

  function append_path(target, points, closed=false) {
    return target
      .append('path')
        .attr("d", draw_line(points) + (closed ? 'Z' : ''))
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
  const delaunay = d3.Delaunay.from(data.map(d => [scaleF2(d.f2), scaleF1(d.f1)]));
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
  const background = addBackground(svg, mapPointsFormants, mapPointsTrapezoid);

  // Draw background labels
  add_labels(svg)
      .attr("x", d => scaleTrapX(d) - (d.side == 'l' ? 20 : 0))
      .attr("y", d => scaleTrapY(d) - (d.side == 't' ? 20 : 0))

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
      .attr("x", d => scaleF2(d.f2))
      .attr("y", d => scaleF1(d.f1))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('pointer-events', 'none')

  // Return the SVG element
  return svg;
}



function addBackground(parent, mapPointsFormants, mapPointsTrapezoid) {

  const container = parent.append("g")
    .attr("class", "background")

  const mappedCorners = mapPointsFormants( CORNERS )
  const outlineGap = 3;

  const bump = (points, gap) => {
    const centerX = d3.mean(points.map(([x, y]) => x))
    const centerY = d3.mean(points.map(([x, y]) => y))
    return points.map(([x, y]) => [
      x + (x > centerX ? gap : -gap),
      y + (y > centerY ? gap : -gap),
    ])
  }

  const outlineOuter = bump(mappedCorners, outlineGap)
  outlineOuter[1][0] -= 1

  TRAP_LINES.forEach(line => {
    container.append("path")
      .attr("class", "grid")
      .attr("d", pointsToPath( mapPointsTrapezoid(line), true))
  });

  // Main (inner) outline
  container.append("path")
    .attr("class", "outline")
    .attr("d", pointsToPath(mappedCorners, true))

  // Decorative (outer) outline
  container.append("path")
    .attr("class", "outline outline-outer")
    .attr("d", pointsToPath(outlineOuter, true))

  return container

}


function pointsToPath(points, closed=false) {
  return "M" + points.map(([x, y]) => `${x},${y}`).join("L") + (closed ? "Z" : "");
}



/* Helpers */



const CORNERS = [
  [ F1_MIN, F2_MIN ],  // top right
  [ F1_MIN, F2_MAX ],  // top left
  [ F1_MAX, F2_MID ],  // bottom left
  [ F1_MAX, F2_MIN ],  // bottom right
]


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

function add_labels(parent) {
  return parent.append("g")
    .selectAll("text")
    .data(labels)
    .join("text")
      .attr("class", "label")
      .attr('text-anchor', d => d.side == 'l' ? 'end' : 'middle')
      .attr('dominant-baseline', 'middle')
      .text(d => d.label)
}
