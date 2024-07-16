function distance([x1, y1], [x2, y2]) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}


export function pointsToPath(points, closed=false) {
  return "M" + points.map(([x, y]) => `${x},${y}`).join("L") + (closed ? "Z" : "");
}


function makeSubsequences(arr, n) {
  const arr2 = arr.concat(arr); // TODO: Not very robust
  return arr.map((v, i) => {
    return arr2.slice(i, i+ n);
  })
}


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
