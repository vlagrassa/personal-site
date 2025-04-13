// ----------------------------------------------------------------------------
//   Imports
// ----------------------------------------------------------------------------

import {
  hexagonPoints,
  hexagonPointsPathData,
  makeCurvedLine,
  pointsToPathData,
  raiseLine,
} from "./utils.js";



// ----------------------------------------------------------------------------
//   Main Function
// ----------------------------------------------------------------------------


export function graph_proficiencies(container, data, config) {

  if (!config.labels) {
    throw Error('Config object must contain a field "labels".');
  }

  // Specify the chart’s dimensions
  const width  = '190';
  const height = '125';

  // Create the SVG container
  const svg = d3.create("svg")
    .attr('class', 'proficiencies')
    .attr("width",  '100%')
    .attr("height", '100%')
    .attr("viewBox", [-(width / 2), -(height / 2), width, height])
    .style("font-size", "6px")

  // Add the background (border & gridlines)
  addBackground(svg)

  // Add the labels
  const labels = config.labels.map(
    (label, idx) => addLabel(svg, label, idx, config)
  )

  // Map the graph data to hex coordinates
  const plotData = config.labels.map(
    (label, idx) => hexCoordinates(idx, data[label.id] || 0)
  )

  // Plot the data
  svg.append('polygon').attr('points', pointsToPathData(plotData)).attr('class', 'plot')

  return svg;
}



// ----------------------------------------------------------------------------
//   Graph Components
// ----------------------------------------------------------------------------


/**
 * Add the background hexagon and gridlines.
 */
function addBackground(parent) {

  // Function to create a curved line
  const line = d3.line()
    .curve(d3.curveCardinalClosed.tension(0.8))

  // Give a path curved edges, with the curve strength based on the `curve` parameter
  const mapPoints = curve => pts => line( makeCurvedLine(pts, curve) )

  // Create a new group for the background
  const g = parent.append('g')

  // Compute corners
  const [x0, y0] = hexCoordinates(0, 5.1);
  const [x1, y1] = hexCoordinates(1, 5.1);
  const [x2, y2] = hexCoordinates(2, 5.1);
  const [x3, y3] = hexCoordinates(3, 5.1);
  const [x4, y4] = hexCoordinates(4, 5.1);
  const [x5, y5] = hexCoordinates(5, 5.1);

  // Add the straight lines across the hexagon
  g.append('line')
    .attr('x1', x0).attr('y1', y0)
    .attr('x2', x3).attr('y2', y3)
    .attr('class', 'grid')
  g.append('line')
    .attr('x1', x1).attr('y1', y1)
    .attr('x2', x4).attr('y2', y4)
    .attr('class', 'grid')
  g.append('line')
    .attr('x1', x2).attr('y1', y2)
    .attr('x2', x5).attr('y2', y5)
    .attr('class', 'grid')

  // Add the hexagons themselves
  // Edges are rounded, based on factor passed to `mapPoints` - I picked these heuristically (i.e. whatever looked good)
  addHexagon(g, 10, 'grid', mapPoints(0.4));
  addHexagon(g, 20, 'grid', mapPoints(0.55));
  addHexagon(g, 30, 'grid', mapPoints(0.7));
  addHexagon(g, 40, 'grid', mapPoints(0.85));
  addHexagon(g, 51, 'border-inner', mapPoints(1));
  addHexagon(g, 53, 'border-outer', mapPoints(1.25));
  addHexagon(g,  1, 'grid', mapPoints(0)).style('fill', 'white');

  // Return the group element
  return g;
}


/**
 * Add a text label for one of the sections.
 * On side labels, breaks text into lines at <wbr> tags; on top & bottom labels, replaces <wbr> tags with spaces.
 *
 * Returns the D3 object, so further attributes / styles / etc can be set.
 */
function addLabel(parent, label, column, config) {
  const [x, y] = hexCoordinates(column, 5.75);

  const text_anchor = [
    'middle', 'start', 'start', 'middle', 'end', 'end',
  ][column];


  // Top or bottom side
  const side = (column + 1) % 6 < 3 ? 'top' : 'bottom';

  const g = parent.append('g')
    .attr('tabindex', 0)
    .attr("class", "label-text")
    .attr('data-label-id', label.id)

  // Enable keyboard navigation (enter and space keys)
  g.on("keypress", (event) => {
    if (event.keyCode === 13 || event.key === ' ') {
      config.onClick( label.id );
    }
  });

  Object.keys(label.title).forEach((lang) => {

    // Get the title text, breaking or splitting on <wbr> tags based on position
    let text = label.title[lang]
    if ( !(column % 3) ) {
      text = text.replace('<wbr>', '')
    }
    const components = text.split('<wbr>')

    // Map each line of text to am element and add to the group
    components.forEach((t, idx) => {
      g
        .append('text')
          .attr('lang',      lang)
          .attr('data-lang', lang)
          .attr('class', config.initialLang == lang ? '' : 'hide')
          .attr('data-line-idx', components.length > 1 ? idx : '')
          .attr('data-line-side', side)
          .attr('text-anchor', text_anchor)
          .attr('dominant-baseline', 'middle')
          .attr('dx', x)
          .attr('dy', y + ((idx - ((components.length - 1) / 2)) * 8))
          .text(t.trim())
          .on('click', () => { config.onClick( label.id ) })
    })
  });

  return g;
}


/**
 * Add a hexagon with a given radius & class(es).
 * Returns the D3 object, so further attributes / styles / etc can be set.
 *
 * @param svg
 *   The parent SVG element to draw to.
 *
 * @param {number} radius
 *   The radius of the hexagon to create (centered around origin). Uses `hexagonPoints` functions to compute.
 *
 * @param {string} _class
 *   CSS class(es) to add to the path object.
 *
 * @param {} [map=null]
 *   Mapping function to transform hexagon points once they've been computed, e.g. to add a curve. Should convert points to points.
 */
function addHexagon(svg, radius, _class="", map=null) {
  const points = map ? map(hexagonPoints(0, 0, radius)) : hexagonPointsPathData(0, 0, radius)
  return svg.append('path')
    .attr('d', points)
    .attr('class', _class)
}



// ----------------------------------------------------------------------------
//   Coordinate Mapping
// ----------------------------------------------------------------------------


/**
 * Convert from "hex" coordinates (column, radius) to Cartesian coordinates (x, y)
 */
function hexCoordinates(column, radius) {

  // Convert to polar coordinates first
  const r = radius * 10;
  const t = (column - 1.5) * Math.PI / 3;

  // Convert polar coordinates to Cartesian coordinates
  return [
    r * Math.cos(t), r * Math.sin(t)
  ]
}
