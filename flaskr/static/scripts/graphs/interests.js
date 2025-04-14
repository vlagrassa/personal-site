/*
  Inspiration:
    - https://observablehq.com/@d3/multi-line-chart/2
    - https://observablehq.com/@d3/pan-zoom-axes
    - https://observablehq.com/@radames/multi-line-chart-zoom
*/

// ----------------------------------------------------------------------------
//   Imports
// ----------------------------------------------------------------------------

import { ContinuousFunctionCache } from "../cache.js";


// ----------------------------------------------------------------------------
//   Main Function
// ----------------------------------------------------------------------------

export function graph_svg_interests(container, {schema, data}, config = {}) {

  // --------------------------------------------------------------------------
  //   Pre-Processing
  // --------------------------------------------------------------------------

  // Map dates to date objects
  data = data.map((d) => Object.assign(d, {'date': new Date(d['date'])}));

  // Get values from config
  const languages   = config.languages       ?? [];
  const initialLang = config.initialLanguage ?? "en";

  // State variables for mouse position
  let xm = null, ym = null;


  // --------------------------------------------------------------------------
  //   Size Config
  // --------------------------------------------------------------------------

  // Get size of parent element
  const bounding_rect = container.getBoundingClientRect();

  // Specify the chart's dimensions
  const width  = bounding_rect.width;
  const height = bounding_rect.height;

  // Set the space around the chart body
  const marginLeft   = 25;
  const marginRight  = 25;
  const marginTop    = 25;
  const marginBottom = 50;

  // Compute dimensions of plot itself, excluding margins
  const plotWidth  = width  - marginLeft - marginRight;
  const plotHeight = height - marginTop  - marginBottom;


  // --------------------------------------------------------------------------
  //   Create the main SVG container object
  // --------------------------------------------------------------------------

  // Create the SVG container
  const svg = d3.create("svg")
    .attr('class', 'graph-interests')
    .attr("width",  '100%')
    .attr("height", '100%')
    .attr("viewBox", [0, 0, width, height])
    .style("font-size", "10px")

  const defs = svg.append("defs")
  defs.append("clipPath")
    .attr("id", "graph-interests-plot-area-mask")
    .style("pointer-events", "none")
  .append("rect")
    .attr("width",  plotWidth)
    .attr("height", height)


  // --------------------------------------------------------------------------
  //   Scaling & Transform Objects
  // --------------------------------------------------------------------------

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
  const maxZoom = 2;
  const zoom = svg.call(
    d3.zoom()
      .scaleExtent([1, maxZoom])
      .translateExtent([[0, 0], [width, 0]])
      .filter(filter)
      .on("zoom", zoomed)
  )

  // Track the current transform provided by the zoom component
  let currentTransform = d3.zoomIdentity;


  // --------------------------------------------------------------------------
  //   Horizontal Axis
  // --------------------------------------------------------------------------


  const dateTickMap = Object.fromEntries(schema.schema.xAxis.map((labels, idx) => [idx, labels]))

  function formatDateTick(d, idx, arr) {
    const label = dateTickMap[d.getUTCMonth()][initialLang]
    return label ? `${label} ${d.getUTCFullYear()}` : '';
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


  // --------------------------------------------------------------------------
  //   Horizontal Drag Bar
  // --------------------------------------------------------------------------

  // Drag bar should overshoot the plot by a bit (for aesthetics)
  const dragBarOvershoot = 10;
  const dragWidth = plotWidth + (2 * dragBarOvershoot);

  // Create a container element for the drag bar
  const dragBarParent = svg.append("g")
    .attr("transform", `translate(${ marginLeft - dragBarOvershoot }, ${ height - 11 })`)

  // Create the drag bar element
  const setRange = createHorizontalDragComponent( dragBarParent, dragWidth, 10 )

  // Create a callback to update the drag bar element from a D3 zoom transform
  // transform.x: Where the scaled object would need to start to appear in the correct position with the given scaling factor.
  // transform.k: The current scaling factor.
  function setRangeFromTransform(transform) {
    const dragPos = (-transform.x / transform.k) / width * dragWidth;
    setRange(dragPos, dragPos + (dragWidth / transform.k))
  }
  setRangeFromTransform(currentTransform);


  // --------------------------------------------------------------------------
  //   Vertical Axis
  // --------------------------------------------------------------------------

  // Read the y-axis labels from the schema, creating an object mapping y value to label object
  const yAxisLabels = Object.fromEntries(schema.schema.yAxis.map(({value, label}) => [value, label]))

  // Create the axis object
  const yAxisContainer = svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .attr("class", "y-axis")
      .call(
        d3.axisLeft(y, 5)
          .ticks(10)
          .tickFormat((d) => (yAxisLabels[d] || {})[initialLang])
          .tickSize(0)
      )
      .call(g => g.select(".domain").remove())

  // Set axis label styling
  yAxisContainer.selectAll(".tick")
    .filter((d) => yAxisLabels[d])
      .selectAll("text")
      .data((d) => Object.keys(yAxisLabels[d] || {}).map(lang => {
        return { lang, text: yAxisLabels[d][lang] };
      }))
      .join("text")
        .attr("lang",      (d) => d.lang)
        .attr("data-lang", (d) => d.lang)
        .attr("class",     (d) => (d.lang === initialLang ? "" : "hide") + " label")
        .attr('dominant-baseline', 'middle')
        .text((d) => d.text)
        .attr("x", -marginLeft + 5)
        .attr("text-anchor", "start")
        .attr('fill', "var(--color-off-black)")
        .attr('stroke', 'white')
        .attr('stroke-width', 8)
        .attr('paint-order', "stroke")
        .attr('stroke-linejoin', 'round')


  // --------------------------------------------------------------------------
  //   Plotted Data Paths
  // --------------------------------------------------------------------------

  // Map data to a list of point objects
  const points = data.map((d) => ({ "x": d.date, "y": y( d.value ), "id": d.id }))

  // Group the points by series ID
  const groups = d3.rollup(points, values => ({ values, id: values[0].id}), d => d.id);

  // D3 function to draw data paths as curves
  const line = d3.line()
    .curve(d3.curveBundle.beta(1))

  // Create a container for the data paths
  const pathsContainer = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("transform", `translate(${ marginLeft }, 0)`)
      .attr("clip-path", "url(#graph-interests-plot-area-mask)")

  // Add the individual paths
  const paths = pathsContainer.selectAll("path")
    .data(groups.values())
    .join("path")
      .attr("d", (d) => line( d.values.map(v => [ x(v.x), v.y ]), x, y ))

  // Clone the paths, so we can use their original lengths / positions to compute points
  const pathClonesContainer = pathsContainer.clone(true)
  pathClonesContainer.attr("visibility", "hidden")
  pathClonesContainer.selectAll("path").attr('stroke', 'none')
  const pathCloneNodes = pathClonesContainer.selectAll("path").nodes();

  // Add the custom data-path class to all of the paths
  // Do this after cloning so the clones aren't marked as data-paths too
  paths.classed('data-path', true)

  // Compute the path nodes
  const pathNodes = paths.nodes().map((node, i) => ({
    'node':   node,
    'id':     Array.from(groups.values())[i].id,

    // Store a reference to the cloned node storing the original size/position/etc
    'nodeOriginal': pathCloneNodes[i],

    // Cache the first n levels of the binary search
    // I don't think this actually improves performance, but it became a point of pride to make it work
    // NOTE: For the stored function, we have to compute relative to the cloned versions
    //       of the paths that aren't stretched / transformed by zooming or panning
    'cache':  new ContinuousFunctionCache(
      (dist) => pathCloneNodes[i].getPointAtLength(dist).x, 0, node.getTotalLength(), 8
    ),
  }))


  // --------------------------------------------------------------------------
  //   Vertical Line (Following Mouse)
  // --------------------------------------------------------------------------

  function formatDateLabel(d) {
    return d.toLocaleString('en-us', { month: 'long', year: 'numeric' });
  }

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


  // --------------------------------------------------------------------------
  //   Post-Processing & Return
  // --------------------------------------------------------------------------

  // Move the axes and axis markers above the plot lines in the rendering order
  xAxisContainer.raise();
  yAxisContainer.raise();

  // Add event handlers
  svg
      .on("pointerenter", pointerentered)
      .on("pointermove",  pointermoved)
      .on("pointerleave", pointerleft)
      .on("touchstart", event => event.preventDefault())

  // Return the SVG object
  return svg;


  // --------------------------------------------------------------------------
  //   Event Handlers
  //   Coordinate which event functions to call when an event is fired.
  // --------------------------------------------------------------------------

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

    // If event is passed, update coords, otherwise use previous coords again
    if (event) {
      [xm, ym] = d3.pointer(event);
    }

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


  // --------------------------------------------------------------------------
  //   Event Functions
  // --------------------------------------------------------------------------

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


  // --------------------------------------------------------------------------
  //   Zoom Functions
  // --------------------------------------------------------------------------

  /**
   * Update to a new zoom transform.
   * The transform object contains the following (relevant) fields:
   *   - x: The x coordinate where the view should start.
   *        This is usually negative, since the object would have to start offscreen
   *        to still be visible when blown up.
   *   - k: The scaling factor
   */
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

    // Update the vertical indicator line with saved mouse coords
    showChartInteraction(null);

    // Update the drag bar
    setRangeFromTransform(transform);
  }

  /**
   * Reset the zoom transform
   */
  function resetZoom() {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  }

  // prevent scrolling then apply the default filter
  function filter(event) {
    event.preventDefault();
    return (!event.ctrlKey || event.type === 'wheel') && !event.button;
  }
}



// ----------------------------------------------------------------------------
//   Helper Functions - Path Points & Distance
// ----------------------------------------------------------------------------


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



// ----------------------------------------------------------------------------
//   Drag Bar
// ----------------------------------------------------------------------------


/**
 * Create a horizontal scrollbar-esque component that controls and reflects
 * both horizontal position and zoom level (i.e. horizontal bounds).
 */
function createHorizontalDragComponent(parent, width, height) {

  // --------------------------------------------------------------------------
  //   Create the track (background)
  // --------------------------------------------------------------------------

  // Container object for the track
  const track = parent.append("g")
    .attr("class", "track")

  // Primary horizontal line
  track.append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", height / 2)
    .attr("y2", height / 2)

  // Left cap
  track.append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", 0)
    .attr("y2", height)

  // Left decor
  track.append("line")
    .attr("x1", -2)
    .attr("x2", -2)
    .attr("y1", 1)
    .attr("y2", height - 1)

  // Right cap
  track.append("line")
    .attr("x1", width)
    .attr("x2", width)
    .attr("y1", 0)
    .attr("y2", height)

  // Right decor
  track.append("line")
    .attr("x1", width + 2)
    .attr("x2", width + 2)
    .attr("y1", 1)
    .attr("y2", height - 1)


  // --------------------------------------------------------------------------
  //   Create the interactive dragging element
  // --------------------------------------------------------------------------

  // Container object for the drag bar
  const drag = parent.append("g")
    .attr("class", "drag")

  // Primary body of the drag bar element
  const dragBody = drag.append("rect")
    .attr("y", 0)
    .attr("height", height)
    .attr("rx", 2)

  // Decorative line on the left of the draggable element main body
  const dragLeft = drag.append("line")
    .attr("y1", 1)
    .attr("y2", height - 1)

  // Decorative line on the right of the draggable element main body
  const dragRight = drag.append("line")
    .attr("y1", 1)
    .attr("y2", height - 1)


  // --------------------------------------------------------------------------
  //   Callback(s)
  // --------------------------------------------------------------------------

  // Callback to update the drag bar width & position to a given range
  const setRange = (start, end) => {
    dragBody
      .attr("x", start)
      .attr("width", end - start)
    dragLeft
      .attr("x1", start - 2)
      .attr("x2", start - 2)
    dragRight
      .attr("x1", end + 2)
      .attr("x2", end + 2)
  }

  // Initialize the range to the full width
  setRange(0, width);

  // Return the set range callback
  return setRange;
}
