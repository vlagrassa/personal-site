/*
  Inspiration:
    - https://observablehq.com/@d3/multi-line-chart/2
    - https://observablehq.com/@d3/pan-zoom-axes
    - https://observablehq.com/@radames/multi-line-chart-zoom
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

  const plotWidth = width - marginLeft - marginRight;

  // Create the SVG container
  const svg = d3.create("svg")
    .attr('class', 'graph-interests')
    .attr("width",  '100%')
    .attr("height", '100%')
    .attr("viewBox", [0, 0, width, height])
    .style("font-size", "10px")

  // Create the x-axis scale
  const x = d3.scaleUtc()
    .domain(d3.extent(data, d => d.date))
    .range([0, plotWidth])

  // Create the y-axis scale
  const y = d3.scaleLinear()
    .domain([0, 5]).nice()
    .range([height - marginBottom, marginTop])

  // Create the zoom object
  // Scaling and translating along the x-axis
  const zoom = svg.call(
    d3.zoom()
      .scaleExtent([1, 2])
      .filter(filter)
      .on("zoom", zoomed)
  )

  // Track the current transform provided by the zoom component
  let currentTransform = d3.zoomIdentity;



  /* Horizontal Axis */

  function formatDateTick(d) {
    return d.getUTCMonth() ? d.toLocaleString('en-us', { month: 'long' }) : d.getUTCFullYear();
  }

  // Create the axis object
  const xAxis = d3.axisBottom(x)
    .ticks(width / 80)
    .tickFormat(formatDateTick)
    .tickSize(0)

  // Add the axis to the graph
  const xAxisContainer = svg.append("g")
      .attr("transform", `translate(${marginLeft}, ${height - marginBottom})`)
      .attr("class", "x-axis")
      .call(xAxis)

  // Add a smaller secondary line, to match site styling
  xAxisContainer.append("line")
    .attr("class", "domain-decor")
    .attr('x1', 2)
    .attr('x2', plotWidth - 2)
    .attr('y1', 3)
    .attr('y2', 3)

  // Move labels down
  xAxisContainer.selectAll(".tick text").attr("y", 16);



  /* Vertical Axis */

  const yAxisLabels = {
    0.5: 'Dormant',
    2.0: 'Normal',
    3.5: 'Moderate',
    5.0: 'Obsessive',
  }

  // Create the axis object
  const yAxisContainer = svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .attr("class", "y-axis")
      .call(
        d3.axisLeft(y, 5)
          .ticks(10)
          .tickFormat((d) => yAxisLabels[d])
          .tickSize(0)
      )
      .call(g => g.select(".domain").remove())

  // Set axis label styling
  yAxisContainer.selectAll(".tick text")
    .attr("x", -marginLeft + 5)
    .attr("text-anchor", "start")




  // Map data to a list of point objects
  const points = data.map((d) => ({ "x": d.date, "y": y( d.value ), "id": d.id }))

  // Group the points by series ID
  const groups = d3.rollup(points, values => ({ values, id: values[0].id}), d => d.id);

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
      .attr("d", (d) => line( d.values.map(v => [ x(v.x), v.y ]), x, y ))
      .attr("transform", `translate(${ marginLeft }, 0)`)

  paths.classed('data-path', true)

  // Compute the path nodes
  const pathNodes = paths.nodes().map((node, i) => ({
    'node':   node,
    'id':     Array.from(groups.values())[i].id,

    // Cache the first n levels of the binary search
    // I don't think this actually improves performance, but it became a point of pride to make it work
    'cache':  new ContinuousFunctionCache(
      (dist) => node.getPointAtLength(dist).x, 0, node.getTotalLength(), 8
    ),
  }))



  // Add vertical line that follows mouse
  const verticalLineContainer = svg.append('g')
  hideVerticalLine();

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


  // Move the axes and axis markers above the plot lines in the rendering order
  xAxisContainer.raise();
  yAxisContainer.raise();


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
    if (marginLeft < xm && xm < (width - marginRight) && ym > (marginTop - 24)) {
      showChartInteraction(event);
    }
    else {
      hideVerticalLine();
      deselectAllPaths();
    }
  }

  function pointerentered(event) {
    deselectAllPaths();
  }

  function pointerleft(event) {
    hideVerticalLine();
    resetAllPaths();
  }

  function showChartInteraction(event) {
    const [xm, ym] = d3.pointer(event);

    // Compute the height of each graph line at the current mouse x-coordinate
    const heights = Object.fromEntries(pathNodes.map(
      ({ id, node, cache }) => ([
        id, iterateComputePathY(node, (xm - marginLeft), cache)
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
    verticalLineLabel.text( formatDateLabel( currentTransform.rescaleX(x).invert(xm - marginLeft)) );
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
    paths.classed('active',   ({id}) => id === pathIdx);
    paths.classed('inactive', ({id}) => id !== pathIdx);

    // Display the highlighted path over top of the other paths
    paths.filter(({id}) => id === pathIdx).raise()
  }

  function deselectAllPaths() {
    paths.classed('active',   false);
    paths.classed('inactive', true);
  }

  function resetAllPaths() {
    paths.classed('active',   false);
    paths.classed('inactive', false);
    svg.node().value = null;
    svg.dispatch("input", {bubbles: true});
  }


  function zoomed({ transform }) {

    // Store the transformation for use by events
    currentTransform = transform;

    // Compute the scaled x-axis
    const xZoom = transform.rescaleX(x);

    // Update the x-axis labels
    xAxisContainer.call(xAxis.scale( xZoom ));
    xAxisContainer.selectAll(".tick text").attr("y", 16);

    // Update the data paths
    paths.attr("d", (d) => {
      return line(d.values.map(v => [ xZoom(v.x), v.y ]), xZoom, y)
    })
  }

  // prevent scrolling then apply the default filter
  function filter(event) {
    event.preventDefault();
    return (!event.ctrlKey || event.type === 'wheel') && !event.button;
  }
}



/*
  Helper Functions
*/


function iterateComputePathPt(pathNode, x, cache = null) {

  // The function to iterate
  const recurse = (currDistance, targetX) => {

    // Compute the point at the current best-guess path distance value
    const newPt = pathNode.getPointAtLength(currDistance);

    // Return the output value and precision for the iteration
    return {

      // The current point and its distance along the path
      value: {
        point: newPt,
        dist:  currDistance,
      },

      // How close the x value is to the target
      precision: targetX - newPt.x,

    }
  };

  // Config object for iteration
  const config = {

    // Get within this distance of the target x value
    'targetPrecision': 0.001,

    // Function (distance => x) is monotonic increasing
    'direction': 1,
  }

  // If cache exists, use it to compute the value, otherwise use static method
  return (cache != null)
    ? cache.iterate(recurse, x, config)
    : ContinuousFunctionCache.iterate(recurse, x, 0, pathNode.getTotalLength(), config)
}

function iterateComputePathY(pathNode, x, cache = null) {
  return iterateComputePathPt(pathNode, x, cache).point.y
}

function iterateComputePathDistance(pathNode, x, cache = null) {
  return iterateComputePathPt(pathNode, x, cache).dist
}
