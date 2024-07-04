/*
  Inspiration:
    - https://observablehq.com/@d3/multi-line-chart/2
*/


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



  // Add the horizontal axis.
  svg.append("g")
      .attr("transform", `translate(0, ${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks(width / 80).tickSize(0))


  // Add the vertical axis.
  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y, 5).ticks(5))
      .call(g => g.append("text")
          .attr("x", -marginLeft)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↑ Interest (%)"))


  const points = data.map((d) => [ x( d.date ), y( d.value ), d.id ])

  // Group the points by series.
  const groups = d3.rollup(points, v => Object.assign(v, {z: v[0][2]}), d => d[2]);

  // Draw the lines.
  const line = d3.line()
  const path = svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "var(--color-secondary-1)")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
    .selectAll("path")
    .data(groups.values())
    .join("path")
      .style("mix-blend-mode", "multiply")
      .attr("d", line)

  // Add an invisible layer for the interactive tip.
  const dot = svg.append("g")
      .attr("display", "none")

  dot.append("circle")
      .attr("r", 2.5)
  dot.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -8)


  // Add vertical line that follows mouse
  const verticalLineContainer = svg.append('g')

  const verticalLine = verticalLineContainer
    .append('line')
      .attr('stroke', 'black')
      .attr('y1', marginTop)
      .attr('y2', height - marginBottom)

  const verticalLineLabel = verticalLineContainer
    .append('text')
      .attr('dy', marginTop)
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .text('Date')


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
      drawVerticalLine(event);
    }
    else {
      hideVerticalLine(event);
    }
    highlightClosestPoint(event);
  }

  function pointerentered(event) {
    deselectAllPaths(event);
  }

  function pointerleft(event) {
    hideVerticalLine(event);
    reselectAllPaths(event);
  }


  /*
    Event Functions
  */

  function drawVerticalLine(event) {
    const [xm, ym] = d3.pointer(event);

    verticalLineContainer
      .style('display', 'unset')
      .style('transform', `translateX(${xm}px)`)
  }

  function hideVerticalLine(event) {
    verticalLineContainer
      .style('display', 'none')
  }



  // When the pointer moves, find the closest point, update the interactive tip, and highlight
  // the corresponding line. Note: we don't actually use Voronoi here, since an exhaustive search
  // is fast enough.
  function highlightClosestPoint(event) {
    const [xm, ym] = d3.pointer(event);
    const i = d3.leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
    const [x, y, k] = points[i];
    path.style("stroke", ({z}) => z === k ? null : "#ddd").filter(({z}) => z === k).raise();
    dot.attr("transform", `translate(${x},${y})`);
    dot.select("text").text(k);
    svg.property("value", data[i]).dispatch("input", {bubbles: true});
  }

  function deselectAllPaths() {
    path.style("mix-blend-mode", null).style("stroke", "#ddd");
    dot.attr("display", null);
  }

  function reselectAllPaths() {
    path.style("mix-blend-mode", "multiply").style("stroke", null);
    dot.attr("display", "none");
    svg.node().value = null;
    svg.dispatch("input", {bubbles: true});
  }
}
