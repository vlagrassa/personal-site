export function pointsToPath(points, closed=false) {
  return "M" + points.map(([x, y]) => `${x},${y}`).join("L") + (closed ? "Z" : "");
}


export function raiseLine(points, gap) {
  const centerX = d3.mean(points.map(([x, y]) => x))
  const centerY = d3.mean(points.map(([x, y]) => y))
  return points.map(([x, y]) => [
    x + (x > centerX ? gap : -gap),
    y + (y > centerY ? gap : -gap),
  ])
}
