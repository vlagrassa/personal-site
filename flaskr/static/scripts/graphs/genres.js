/*
  Inspiration:
    - Zoomable Sunburst  [https://observablehq.com/@d3/zoomable-sunburst]
*/

export function graph_svg_genres(data) {

  // Specify the chart’s dimensions.
  const width = 500;
  const height = width;
  const radius = width / 6;

  // Percentage of the radius
  const spacing = 0.02;

  // Create the color scale
  const color = make_color_scale(data)

  // Create the arc generator
  const arc = make_arc_generator(radius, spacing)


  // Compute the layout
  const hierarchy = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

  // Maps elements in the hierarchy to polar(-ish) coordinates
  const root = d3.partition()
      .size([2 * Math.PI, hierarchy.height + 1])
    (hierarchy);
  root.each(d => d.current = d);


  // Create the SVG container
  const svg = d3.create("svg")
      .attr("width",  '100%')
      .attr("height", '100%')
      .attr("viewBox", [-width / 2, -height / 2, width, width])
      .style("font-size", "10px")

  // Append the arcs
  const path = svg.append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
      .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
      .attr("d", d => arc(d.current));

  // Make them clickable if they have children
  path.filter(d => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);


  // Add labels
  const label = svg.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", d => +labelVisible(d.current))
      .attr("transform", d => labelTransform(d.current, radius))
      .text(d => d.data.name);

  // Create the center circle
  const parent = svg.append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

  // Handle zoom on click
  function clicked(event, p) {
    parent.datum(p.parent || root);

    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });

    const t = svg.transition().duration(750);

    // Transition the data on all arcs, even the ones that aren’t visible,
    // so that if this transition is interrupted, entering arcs will start
    // the next transition from the desired position.
    path.transition(t)
        .tween("data", d => {
          const i = d3.interpolate(d.current, d.target);
          return t => d.current = i(t);
        })
        .filter(function(d) {
          return +this.getAttribute("fill-opacity") || arcVisible(d.target);
        })
        .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
        .attrTween("d", d => () => arc(d.current));

    label
        .filter(function(d) {
          return +this.getAttribute("fill-opacity") || labelVisible(d.target);
        })
        .transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current, radius));
  }

  return svg;
}



/* Helpers */


function make_color_scale(data) {

  const color_scale = d3.scaleLinear()
    .domain([0, 0.33, 0.66, 1])
    .range(["#E26692", "#FFF473", "#4E90A6", "#E26692"])
    .interpolate(d3.interpolateHcl)

  return d3.scaleOrdinal(d3.quantize(color_scale, data.children.length + 1));
}


// Create an arc generator function
function make_arc_generator(radius, spacing=0.005) {
  return d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, spacing))
    .padRadius(radius * 1.5)
    .cornerRadius(4)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1) - (radius * spacing))
}


function arcVisible(d) {
  return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
}

function labelVisible(d) {
  return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
}

function labelTransform(d, radius) {
  const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
  const y = (d.y0 + d.y1) / 2 * radius;
  return `rotate(${x - 90}) translate(${y},0) rotate(${90-x})`;
}
