import { pointsToPath, raiseLine, makeCurvedLine, hexagonPointsPath } from "../utils.js";


/* Constants */

// First formant range
const F1_MIN = 100;
const F1_MAX = 900;

// Second formant range
const F2_MIN = 300;
const F2_MID = 2100;
const F2_MAX = 2700;



export function graph_svg_vowels(container, {data, schema}, config = {}) {

  const width  = 400;
  const margin = 40;

  const sidebarWidth = 88;
  const spacing = 25;

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

  // Draw background gridlines
  const background = addBackground(svg, mapPointsFormants, mapPointsTrapezoid);

  // Draw background labels
  add_labels(svg, schema['labels'], config)
      .attr("x", d => scaleTrapX(d))
      .attr("y", d => scaleTrapY(d))

  // Add cursors on trapezoid
  const {container: cursors, show: showCrosshairs, hide: hideCrosshairs} = addCursors(svg, width, width, formantsToXY)
  cursors.attr('clip-path', "url(#trap-boundary)")

  // Draw trapezoid
  const outline = addOutline(svg, mapPointsFormants, mapPointsTrapezoid);

  // Draw IPA symbols
  const symbols = svg.append("g")
      .attr("font-size", "2.5em")
    .selectAll("text")
    .data(data)
    .join("text")
      .text(d => d.symbol)
      .attr('class', 'vowel')
      .attr("x", d => scaleF2(d.f2))
      .attr("y", d => scaleF1(d.f1))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')

  // Add the spectrum window sidebar
  const {container: spectrumWindow, show: showFormantBars, hide: hideFormantBars} =
    addSpectrumWindow(svg, width + spacing, margin, sidebarWidth, width - 2*margin)


  svg
    .on("pointermove",  (event) => {
      const [xm, ym] = d3.pointer(event);
      if (margin < ym && ym < width-margin && margin < xm && xm < width-margin) {
        showCursors(xm, ym)
      }
      else {
        hideCursors()
      }
    })

  // Return the SVG element
  return svg;



  function showCursors(xm, ym) {

    const f1 = scaleF1.invert(ym)
    const f2 = scaleF2.invert(xm)

    showCrosshairs(f1, f2);
    showFormantBars(f1, f2);

    // barF1.classed('disabled', f1m <= f2m)
    // barF2.classed('disabled', f1m <= f2m)
    // cursorF1.classed('disabled', f1m <= f2m)
    // cursorF2.classed('disabled', f1m <= f2m)
  }

  function hideCursors() {
    hideCrosshairs();
    hideFormantBars();
  }
}


function addOutline(parent, mapPointsFormants, mapPointsTrapezoid) {

  const container = parent.append("g")
    .attr("class", "background")

  const mappedCorners = mapPointsFormants( CORNERS )
  const outlineGap = 3;


  const outlineOuter = raiseLine(mappedCorners, outlineGap)
  outlineOuter[1][0] -= 1
  outlineOuter[2][0] += 1

  const line = d3.line()
    .curve(d3.curveCardinalClosed.tension(0.9))

  // Main (inner) outline
  container.append("path")
    .attr("class", "outline")
    .attr("d", line(makeCurvedLine(mappedCorners, 4)))

  // Decorative (outer) outline
  container.append("path")
    .attr("class", "outline outline-outer")
    .attr("d", line(makeCurvedLine(outlineOuter, 5)))

  return container

}


function addBackground(parent, mapPointsFormants, mapPointsTrapezoid) {
  const container = parent.append("g")
    .attr("class", "background")

  TRAP_LINES.forEach(line => {
    container.append("path")
      .attr("class", "grid")
      .attr("d", pointsToPath( mapPointsTrapezoid(line), true))
  });

  return container;
}


function addCursor(parent) {
  return parent.append("line")
    .attr('class', 'cursor-line')
    .attr('clip-path', "url(#trap-boundary)")
}

function addCursors(parent, minWidth, minHeight, formantsToXY) {
  const container = parent.append("g")
  const cursors = container.append("g")

  const hexRadius = 4;
  const hexMultiplier = Math.sqrt(3) / 2;

  const cursorY1 = cursors.append("line")
    .attr('class', 'cursor-line')
    .attr('y1', -hexRadius)
    .attr('y2', -minHeight)

  const cursorY2 = cursors.append("line")
    .attr('class', 'cursor-line')
    .attr('y1', hexRadius)
    .attr('y2', minHeight)

  const cursorX1 = cursors.append("line")
    .attr('class', 'cursor-line')
    .attr('x1', -hexRadius * hexMultiplier)
    .attr('x2', -minWidth)
    .attr('stroke-dasharray', '4 3 1 3')

  const cursorX2 = cursors.append("line")
    .attr('class', 'cursor-line')
    .attr('x1', hexRadius * hexMultiplier)
    .attr('x2', minWidth)
    .attr('stroke-dasharray', '4 3 1 3')

  const crosshair = cursors.append('path')
    .attr('d', hexagonPointsPath(0, 0, 4))
    .attr('class', "cursor-line")

  function show(f1, f2) {
    const {x, y} = formantsToXY(f1, f2);
    cursors.attr('transform', `translate(${x}, ${y})`)
    container.style('display', 'unset')
  }

  function hide() {
    container.style('display', 'none')
  }

  return {container, show, hide};
}


function addSpectrumWindow(parent, x, y, width, height) {

  const scaleFormantBar = d3.scaleLinear().domain([0, 3000]).range([height, 0])

  const outlineGap = 3;

  const container = parent.append("g")
    .attr("class", "spectrum-window")
    .attr("transform", `translate(${x}, ${y})`)

  const barF1 = container.append("line")
    .attr('x1', 0)
    .attr('x2', width)
    .attr("class", "formant-line")
    .attr('stroke-dasharray', '8 5 2 5')

  const barF2 = container.append("line")
    .attr('x1', 0)
    .attr('x2', width)
    .attr("class", "formant-line")

  container.append("rect")
    .attr('rx', 5)
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'outline')

  container.append("rect")
    .attr('x', -outlineGap)
    .attr('y', -outlineGap)
    .attr('rx', 7)
    .attr('width', width + outlineGap*2)
    .attr('height', height + outlineGap*2)
    .attr('class', 'outline outline-outer')

  function show(f1, f2) {
    const f1m = scaleFormantBar(f1)
    const f2m = scaleFormantBar(f2)
    barF1.attr('y1', f1m).attr('y2', f1m).attr('display', 'unset')
    barF2.attr('y1', f2m).attr('y2', f2m).attr('display', 'unset')
  }

  function hide() {
    barF1.attr('display', 'none')
    barF2.attr('display', 'none')
  }

  return {container, show, hide};
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


function add_labels(parent, labels, config) {

  // Get values from config
  const languages   = config.languages       ?? [];
  const initialLang = config.initialLanguage ?? "en";

  // Join the two formant lists into a single list
  // with a member "formant" that tracks which formant list each item came from
  const labelsWithFormants = Object.keys(labels).flatMap(
    (formant) => labels[formant].map( (label) => Object.assign(label, {formant}) )
  )

  // Add all labels to a new group
  return parent.append("g")

    // Create a group for each label
    .selectAll("g")
    .data(labelsWithFormants)
    .join("g")

    // Create a text object for each language in each label
    .selectAll("text")
    .data((d) => Object.keys(d.label).map(lang => ({
        lang,
        text: d.label[lang],
        x: d.backness ?? -0.05,
        y: d.height   ??  1.05,
        formant: d.formant,
      }))
    )
    .join("text")

      // Render an individual language label
      .filter(d => languages.includes(d.lang))
      .attr("lang",      (d) => d.lang)
      .attr("data-lang", (d) => d.lang)
      .attr("class",     (d) => (d.lang === initialLang ? "" : "hide") + " label")
      .attr("text-anchor", d => d.formant == "f1" ? "end" : "middle")
      .attr('dominant-baseline', 'middle')
      .text((d) => d.text)
}
