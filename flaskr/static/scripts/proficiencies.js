export function graph_proficiencies(container, data, config) {

  if (!config.palette) {
    throw Error('Config object must contain a field "palette".');
  }

  // Specify the chart’s dimensions
  const width  = '140';
  const height = '125';

  // Create the SVG container
  const svg = d3.create("svg")
    .attr('class', 'proficiencies-svg')
    .attr("width",  '100%')
    .attr("height", '100%')
    .attr("viewBox", [-(width / 2), -(height / 2), width, height])
    .style("font-size", "6px")

  // Add the background (border & gridlines)
  addBackground(svg, config.palette)

  // Plot the data
  svg.append('polygon')
    .attr('points', pointsToPath([
      hexCoordinates(0, 5),
      hexCoordinates(1, 1),
      hexCoordinates(2, 2),
      hexCoordinates(3, 5),
      hexCoordinates(4, 3),
      hexCoordinates(5, 4),
    ]))
    .style('stroke-width', '0.5px')
    .style('stroke',       config.palette.dataStroke)
    .style('fill',         config.palette.dataFill)
    .style('fill-opacity', '0.25')

  return svg;
}



/* Graph Components */


/**
 * Add the background hexagon and gridlines.
 */
function addBackground(parent, color_palette) {

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
    .style('stroke', color_palette.grid)
    .style('stroke-width', '0.5px')
  g.append('line')
    .attr('x1', x1).attr('y1', y1)
    .attr('x2', x4).attr('y2', y4)
    .style('stroke', color_palette.grid)
    .style('stroke-width', '0.5px')
  g.append('line')
    .attr('x1', x2).attr('y1', y2)
    .attr('x2', x5).attr('y2', y5)
    .style('stroke', color_palette.grid)
    .style('stroke-width', '0.5px')

  // Add the hexagons themselves
  addHexagon(g, 10, color_palette.grid);
  addHexagon(g, 20, color_palette.grid);
  addHexagon(g, 30, color_palette.grid);
  addHexagon(g, 40, color_palette.grid);
  addHexagon(g, 51, color_palette.border).style('stroke-width', '1px');
  addHexagon(g, 53, color_palette.border);
  addHexagon(g,  1, color_palette.grid).style('fill', 'white');

  // Return the group element
  return g;
}


/**
 * Add a hexagon with a given radius and color.
 * Returns the D3 object, so further attributes / styles / etc can be set.
 */
function addHexagon(svg, radius, color) {
  return svg.append('polygon')
    .attr('points', hexagonPointsPath(0, 0, radius))
    .style('stroke', color)
    .style('stroke-width', '0.5px')
    .style('fill', 'none')
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
