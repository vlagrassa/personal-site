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
  addHexagon(g, 10, 'grid');
  addHexagon(g, 20, 'grid');
  addHexagon(g, 30, 'grid');
  addHexagon(g, 40, 'grid');
  addHexagon(g, 51, 'border-inner');
  addHexagon(g, 53, 'border-outer');
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
function addLabel(parent, label, column, config) {
  const [x, y] = hexCoordinates(column, 5.75);

  const text_anchor = [
    'middle', 'start', 'start', 'middle', 'end', 'end',
  ][column];

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
