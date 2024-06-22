/*
  Inspiration:
    - Zoomable Sunburst  [https://observablehq.com/@d3/zoomable-sunburst]
    - Sequences Sunburst [https://observablehq.com/@kerryrodden/sequences-sunburst]
*/

export function graph_svg_genres(container, data) {

  const bounding_rect = container.getBoundingClientRect();

  // Specify the chart’s dimensions.
  const width  = bounding_rect.width;
  const height = bounding_rect.height;
  const radius = Math.min(width, height) / 6;

  // Percentage of the radius
  const spacing = 0.02;

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
      .attr('class', 'graph-genres')
      .attr("width",  '100%')
      .attr("height", '100%')
      .attr("viewBox", [-(width / 2), -(height / 2), width, height])
      .style("font-size", "10px")

  // Append the arcs
  const path = svg.append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
      .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
      .attr("d", d => arc(d.current))
      .classed('arc', true)
      .classed('hidden', d => !arcVisible(d.current))

  // Make them clickable if they have children
  path.filter(d => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);

  // Highlight arcs on mouseover
  path.on('mouseenter', highlight_arc)


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


  // Deselect outside chart bounds
  // This prevents deselection when in gaps between wedges
  svg.on('mouseleave', remove_arc_highlight);
  parent.on('mouseenter', remove_arc_highlight)
  svg.append('path')
    .attr("d", d => arc({x0: 0, x1: 2*Math.PI, y0: 3, y1: 5}))
    .attr('fill', 'transparent')
    .on('mouseenter', remove_arc_highlight)



  /* Main Genre Label */

  const main_label_1 = svg.append("text")
    .style("user-select", "none")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .attr('dominant-baseline', "middle")
    .attr("font-size", "2em")

  const main_label_2 = svg.append("text")
    .style("user-select", "none")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .attr('dominant-baseline', "middle")
    .attr('dy', "-2em")
    .attr("font-size", "1.25em")

  const main_label_3 = svg.append("text")
    .style("user-select", "none")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .attr('dominant-baseline', "middle")
    .attr('dy', "2em")
    .attr("font-size", "1.25em")

  function render_main_label(d) {

    // Get the currently hovered / selected genre and its parent, if available
    const current_genre = d && d.depth > 0 ? d.data.name : (curr_genre ? curr_genre.data.name : null);
    const parent_genre  = d && d.depth > 1 ? d.parent.data.name : null;

    // Get the percentage of the current genre relative to the whole graph
    const percentage_genre = d ?? curr_genre;
    const percentage = percentage_genre ? ((100 * percentage_genre.value) / root.value).toPrecision(3) + '%' : null;

    // Display the computed values
    main_label_1.text(current_genre)
    main_label_2.text(parent_genre)
    main_label_3.text(percentage)
  }



  /* Handlers */

  let curr_genre = null;

  // Handle zoom on click
  function clicked(event, p) {
    parent.datum(p.parent || root);

    curr_genre = p.depth > 0 ? p : null;
    render_main_label(curr_genre);

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
        .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
        .attrTween("d", d => () => arc(d.current))

    path.classed("hidden", d => !arcVisible(d.target))

    label
        .filter(function(d) {
          return +this.getAttribute("fill-opacity") || labelVisible(d.target);
        })
        .transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current, radius));
  }



  // Highlight an arc on mouseover
  function highlight_arc(event, d) {
    if (event.target.classList.contains('hidden')) return;

    // Get the ancestors of the current segment, minus the root
    const sequence = d.ancestors().reverse().slice(1);

    // Highlight the ancestors
    path.classed('active',   node => sequence.indexOf(node) >= 0);
    path.classed('inactive', node => sequence.indexOf(node) <  0);

    render_main_label(d);
  }

  // Remove arc highlight, restoring the chart
  function remove_arc_highlight(event, d) {
    path.classed('active', false).classed('inactive', false);

    render_main_label(null)
  }



  return svg;
}



/* Helpers */


const COLOR_MAP = {
  "pop":     "#E26692",
  "rock":    "#4E90A6",
  "edm":     "rgb(255, 163, 113)",
  "ambient": "rgb( 92, 205, 161)",
  "hip-hop": "rgb(144, 131, 202)",
}
const COLOR = (x) => COLOR_MAP[x.toLowerCase()];


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

function labelTransform(d, radius, offset={}) {
  const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
  const y = (d.y0 + d.y1) / 2 * radius;
  const offset_x = offset['x'] || '0';
  const offset_y = offset['y'] || '0';
  return `rotate(${x - 90}) translate(${y},0) rotate(${90-x}) translate(${offset_x},${offset_y})`;
}
