/*
  Inspiration:
    - https://observablehq.com/@d3/multi-line-chart/2
*/


import { ContinuousFunctionCache } from "../cache.js";


export function graph_svg_interests(container, {schema, data}) {

  // Mape dates to date objects
  data = data.map((d) => Object.assign(d, {'date': new Date(d['date'])}));

  const bounding_rect = container.getBoundingClientRect();

  // Specify the chart’s dimensions.
  const width  = bounding_rect.width;
  const height = bounding_rect.height;

  const marginLeft   = 25;
  const marginRight  = 25;
  const marginTop    = 25;
  const marginBottom = 25;

  // Create the SVG container
  const svg = d3.create("svg")
    .attr('class', 'graph-interests')
    .attr("width",  '100%')
    .attr("height", '100%')
    .attr("viewBox", [0, 0, width, height])
    .style("font-size", "10px")

  // Create the positional scales.
  const x = d3.scaleUtc()
    .domain(d3.extent(data, d => d.date))
    .range([marginLeft, width - marginRight])

  const y = d3.scaleLinear()
    .domain([0, 5]).nice()
    .range([height - marginBottom, marginTop])



  /* Horizontal Axis */

  function formatDateTick(d) {
    return d.getUTCMonth() ? d.toLocaleString('en-us', { month: 'long' }) : d.getUTCFullYear();
  }

  // Create the axis object
  const xAxis = svg.append("g")
      .attr("transform", `translate(0, ${height - marginBottom})`)
      .call(
        d3.axisBottom(x)
          .ticks(width / 80)
          .tickFormat(formatDateTick)
          .tickSize(0)
      )
      .call(g => g.select(".domain").attr("stroke-width", 2))

  // Add a smaller secondary line, to match site styling
  svg.append("line")
    .attr('x1', marginLeft + 2)
    .attr('x2', width - (marginLeft + 2))
    .attr('y1', height - (marginBottom - 3))
    .attr('y2', height - (marginBottom - 3))
    .attr('stroke', 'black')
    .attr('fill', 'none')

  // Move labels down
  xAxis.selectAll(".tick text").attr("y", 16);



  /* Vertical Axis */

  const yAxisLabels = {
    0.5: 'Dormant',
    2.0: 'Normal',
    3.5: 'Moderate',
    5.0: 'Obsessive',
  }

  // Create the axis object
  const yAxis = svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(
        d3.axisLeft(y, 5)
          .ticks(10)
          .tickFormat((d) => yAxisLabels[d])
          .tickSize(0)
      )
      .call(g => g.select(".domain").remove())

  // Set axis label styling
  yAxis.selectAll(".tick text")
    .attr("x", -marginLeft + 5)
    .attr("text-anchor", "start")
    .style("color", "var(--color-gray)")



  const points = data.map((d) => [ x( d.date ), y( d.value ), d.id ])

  // Group the points by series.
  const groups = d3.rollup(points, v => Object.assign(v, {z: v[0][2]}), d => d[2]);

  // Draw the lines.
  const line = d3.line()
    .curve(d3.curveBundle.beta(1))

  const paths = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
    .selectAll("path")
    .data(groups.values())
    .join("path")
      .attr("d", line)

  paths.classed('data-path', true)

  // Compute the path nodes
  const pathNodes = paths.nodes().map((node, i) => ({
    'node':   node,
    'length': node.getTotalLength(),
    'id':     Array.from(groups.values())[i].z,

    // Cache the first n levels of the binary search
    // I don't think this actually improves performance, but it became a point of pride to make it work
    'cache':  new ContinuousFunctionCache(
      (dist) => node.getPointAtLength(dist).x, 0, node.getTotalLength(), 8
    ),
  }))



  // Add vertical line that follows mouse
  const verticalLineContainer = svg.append('g')

  const verticalLine = verticalLineContainer
    .append('line')
      .attr('stroke', 'black')
      .attr('y1', marginTop - 14)
      .attr('y2', height - marginBottom)

  const verticalLineLabel = verticalLineContainer
    .append('text')
      .attr('dy', marginTop - 16)
      .text('Date')
      .attr("class", "vertical-line-label")

  const markers = verticalLineContainer.append('g')
    .selectAll('circle')
    .data(pathNodes)
    .join('circle')
      .style('r', 2.5)
  markers.classed('vertical-marker', true);


  // Add event handlers
  svg
      .on("pointerenter", pointerentered)
      .on("pointermove",  pointermoved)
      .on("pointerleave", pointerleft)
      .on("touchstart", event => event.preventDefault())


  return svg;


  /*
    Event Handlers
    Coordinate which event functions to call when an event is fired.
  */

  function pointermoved(event) {
    const [xm, ym] = d3.pointer(event);
    if (marginLeft < xm && xm < (width - marginRight)) {
      showChartInteraction(event);
    }
    else {
      hideVerticalLine();
      reselectAllPaths();
    }
  }

  function pointerentered(event) {
    deselectAllPaths(event);
  }

  function pointerleft(event) {
    hideVerticalLine();
    reselectAllPaths();
  }

  function showChartInteraction(event) {
    const [xm, ym] = d3.pointer(event);

    // Compute the height of each graph line at the current mouse x-coordinate
    const heights = Object.fromEntries(pathNodes.map(
      ({ node, length, id, cache }) => ([
        id, iterateComputePathY(node, xm, cache)
      ])
    ))

    // Compute the ID of the graph line closest to the mouse
    // at the current x-coordinate (i.e. closest along the vertical line)
    const nearestId = d3.least(
      Object.keys(heights),
      (id) => Math.abs(heights[id] - ym)
    )

    // Render the relevant components
    drawVerticalLine(xm, heights)
    highlightPath(nearestId);
  }



  /*
    Event Functions
  */

  function drawVerticalLine(xm, heights) {

    // Position the line on the given x-coordinate
    verticalLineContainer
      .style('display', 'unset')
      .style('transform', `translateX(${xm}px)`)

    // Position the markers on the given y-coordinates
    markers
        .attr('cy', (d) => heights[d.id])

    // Update the line label
    verticalLineLabel.text( formatDateLabel(x.invert(xm)) );
  }

  function hideVerticalLine() {
    verticalLineContainer
      .style('display', 'none')
  }

  /**
   * Highlight the path & marker with the given ID,
   * and desaturate all the other paths
   */
  function highlightPath(pathIdx) {

    // Highlight the marker on the vertical line
    markers.classed('active',   ({id}) => id === pathIdx);
    markers.classed('inactive', ({id}) => id !== pathIdx);

    // Highlight the given path & desaturate all the other paths w/ active & inactive classes
    paths.classed('active',   ({z}) => z === pathIdx);
    paths.classed('inactive', ({z}) => z !== pathIdx);
  }

  function deselectAllPaths() {
    paths.classed('inactive', true);
  }

  function reselectAllPaths() {
    paths.classed('active',   false);
    paths.classed('inactive', false);
    svg.node().value = null;
    svg.dispatch("input", {bubbles: true});
  }
}



/*
  Helper Functions
*/


function iterateComputePathPt(pathNode, x, binarySearchCache = null) {

  let length, dist;
  if (binarySearchCache == null) {
    length = pathNode.getTotalLength() / 2;
    dist   = length;
  }
  else {
    length = binarySearchCache.step_size / 2;
    dist   = binarySearchCache.computeRange(x)[0] + (binarySearchCache.step_size / 2);
  }


  const targetPrecision = 0.5;

  let iter = 100;
  let newPt = null;
  let precision = null

  while (iter > 0) {
    newPt = pathNode.getPointAtLength(dist);
    precision = x - newPt.x
    if (Math.abs(precision) < targetPrecision) {
      return [newPt, dist]
    }
    else if (precision > 0) {
      length /= 2
      dist += length;
    }
    else {
      length /= 2
      dist -= length;
    }
    iter--;
  }

  console.error('Timed out :(');
  return [newPt, dist];
}

function iterateComputePathY(pathNode, x, binarySearchCache = null) {
  return iterateComputePathPt(pathNode, x, binarySearchCache)[0].y;
}

function iterateComputePathDistance(pathNode, x, binarySearchCache = null) {
  return iterateComputePathPt(pathNode, x, binarySearchCache)[1];
}
