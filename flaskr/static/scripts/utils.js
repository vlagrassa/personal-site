// ----------------------------------------------------------------------------
//   Math
// ----------------------------------------------------------------------------


function distance([x1, y1], [x2, y2]) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}



// ----------------------------------------------------------------------------
//   Coordinate Mapping
// ----------------------------------------------------------------------------


/**
 * Convert from "hex" coordinates (column, radius) to Cartesian coordinates (x, y)
 *
 * @param {number} column
 *   The column within the hexagon, akin to polar angle. Starts from 0 <=> top point and moves clockwise.
 *
 * @param {number} radius
 *   The distance from the center of the hexagon. Typically 1 is mapped to the edge.
 */
export function hexToCartesian(column, radius) {

  // Convert to polar coordinates first
  const r = radius * 10;
  const t = (column - 1.5) * Math.PI / 3;

  // Convert polar coordinates to Cartesian coordinates
  return [
    r * Math.cos(t), r * Math.sin(t)
  ]
}



// ----------------------------------------------------------------------------
//   Generic Array Operations
// ----------------------------------------------------------------------------


export function range(start, stop=null, step=1, includeFinal=false) {
  if (stop === null) {
    stop = start;
    start = 0;
  }
  let numSteps = (stop - start) / step
  numSteps = Math.ceil(numSteps)

  const arr = Array.from(Array(numSteps).keys()).map(i => start + (step * i))
  if (includeFinal) {
    arr.push(stop)
  }
  return arr
}


function makeSubsequences(arr, n) {
  const arr2 = arr.concat(arr); // TODO: Not very robust
  return arr.map((v, i) => {
    return arr2.slice(i, i+ n);
  })
}



// ----------------------------------------------------------------------------
//   SVG Points
// ----------------------------------------------------------------------------


/**
 * Convert an array of point objects to an SVG path string,
 * with commands.  Use for `d` attribute?
 */
export function pointsToPath(points, closed=false) {
  return "M" + points.map(([x, y]) => `${x},${y}`).join("L") + (closed ? "Z" : "");
}


/**
 * Convert an array of point objects to an SVG path data string,
 * with just the point values.  Use for `d` attribute.
 */
export function pointsToPathData(points) {
  return points.map(([x, y]) => `${x},${y}`).join(' ')
}



// ----------------------------------------------------------------------------
//   Modifying SVG Lines
// ----------------------------------------------------------------------------


export function getAngles(points) {
  const angles = makeSubsequences(points, 3).map(([pl, p, pr]) => {
    const lengthL  = distance(p, pl)
    const lengthR  = distance(p, pr)
    const lengthLR = distance(pl, pr)

    return Math.acos( (lengthL * lengthL + lengthR * lengthR - lengthLR * lengthLR) / (2 * lengthL * lengthR) )
  });
  return [ angles[angles.length - 1], ...angles.slice(1) ];
}


function pointsAndAngles(points) {
  const angles = getAngles(points);
  return points.map((pt, i) => [pt, angles[i]])
}


export function makeCurvedLine(points, curve) {
  return makeSubsequences(pointsAndAngles(points), 2).flatMap(([[p1, a1], [p2, a2]]) => {
    const theta = Math.atan2((p2[1] - p1[1]), (p2[0] - p1[0]));
    const dx = curve * Math.cos(theta)
    const dy = curve * Math.sin(theta)
    return [
      [ p1[0] + (a1 * dx), p1[1] + (a1 * dy) ],
      [ p2[0] - (a2 * dx), p2[1] - (a2 * dy) ],
    ]
  })
}


export function raiseLine(points, gap) {
  const centerX = d3.mean(points.map(([x, y]) => x))
  const centerY = d3.mean(points.map(([x, y]) => y))
  return points.map(([x, y]) => [
    x + (x > centerX ? gap : -gap),
    y + (y > centerY ? gap : -gap),
  ])
}



// ----------------------------------------------------------------------------
//   Hexagons
// ----------------------------------------------------------------------------


// Adapted from https://stackoverflow.com/a/67667511
export function hexagonPoints(x, y, radius) {
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


export function hexagonPointsPath(x, y, radius) {
  return pointsToPath(hexagonPoints(x, y, radius), true)
}


export function hexagonPointsPathData(x, y, radius) {
  return pointsToPathData(hexagonPoints(x, y, radius))
}
