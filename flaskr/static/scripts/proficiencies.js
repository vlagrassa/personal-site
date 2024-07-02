export function graph_proficiencies(container, data, config) {

  if (!config.labels) {
    throw Error('Config object must contain a field "labels".');
  }

  // Specify the chart’s dimensions
  const width  = '175';
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
    (label, idx) => addLabel(svg, label.title['en'], idx)
  )

  // Map the graph data to hex coordinates
  const plotData = config.labels.map(
    (label, idx) => hexCoordinates(idx, data[label.id] || 0)
  )

  // Plot the data
  svg.append('polygon').attr('points', pointsToPath(plotData)).attr('class', 'plot')

  return svg;
}



/* Graph Components */


/**
 * Add the background hexagon and gridlines.
 */
function addBackground(parent) {

  // Create a new group for the background
  const g = parent.append('g')

  // Compute corners
  const [x0, y0] = hexCoordinates(0, 5);
  const [x1, y1] = hexCoordinates(1, 5);
  const [x2, y2] = hexCoordinates(2, 5);
  const [x3, y3] = hexCoordinates(3, 5);
  const [x4, y4] = hexCoordinates(4, 5);
  const [x5, y5] = hexCoordinates(5, 5);

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
  addHexagon(g, 10, 'grid');
  addHexagon(g, 20, 'grid');
  addHexagon(g, 30, 'grid');
  addHexagon(g, 40, 'grid');
  addHexagon(g, 51, 'border-outer');
  addHexagon(g, 53, 'border-inner');
  addHexagon(g,  1, 'grid').style('fill', 'white');

  // Return the group element
  return g;
}


/**
 * Add a text label for one of the sections.
 * On side labels, breaks text into lines at <wbr> tags; on top & bottom labels, replaces <wbr> tags with spaces.
 *
 * Returns the D3 object, so further attributes / styles / etc can be set.
 */
function addLabel(parent, text, column) {
  const [x, y] = hexCoordinates(column, 5.75);

  const text_anchor = [
    'middle', 'start', 'start', 'middle', 'end', 'end',
  ][column];

  if ( !(column % 3) ) {
    text = text.replace('<wbr>', ' ')
  }
  const components = text.split('<wbr>')

  const g = parent.append('g')
    .attr("class", "label-text");

  components.forEach((t, idx) => {
    g
      .append('text')
        .attr('text-anchor', text_anchor)
        .attr('dominant-baseline', 'middle')
        .attr('dx', x)
        .attr('dy', y + ((idx - ((components.length - 1) / 2)) * 8))
        .text(t)
  })
  return g;
}


/**
 * Add a hexagon with a given radius and color.
 * Returns the D3 object, so further attributes / styles / etc can be set.
 */
function addHexagon(svg, radius, _class="") {
  return svg.append('polygon')
    .attr('points', hexagonPointsPath(0, 0, radius))
    .attr('class', _class)
}



/* Coordinate Mapping */


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



/* Helper Functions */


function pointsToPath(arr) {
  return arr.map(([x, y]) => `${x},${y}`).join(' ')
}

// Adapted from https://stackoverflow.com/a/67667511
function hexagonPoints(x, y, radius) {
  const halfWidth = radius * Math.sqrt(3) / 2;
  return [
      [ x,             y - ( radius     ) ],
      [ x + halfWidth, y - ( radius / 2 ) ],
      [ x + halfWidth, y + ( radius / 2 ) ],
      [ x,             y + ( radius     ) ],
      [ x - halfWidth, y + ( radius / 2 ) ],
      [ x - halfWidth, y - ( radius / 2 ) ],
  ];
}

function hexagonPointsPath(x, y, radius) {
  return pointsToPath(hexagonPoints(x, y, radius))
}
