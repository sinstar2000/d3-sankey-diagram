// The reusable SVG component for the sliced Sankey diagram

import sankeyLink from './linkPath.js'
import sankeyNode from './node.js'
import positionGroup from './positionGroup.js'

import {select, event} from 'd3-selection'
import {transition} from 'd3-transition'
import {dispatch} from 'd3-dispatch'
import {format} from 'd3-format'
import {interpolate} from 'd3-interpolate'
import {map} from 'd3-collection'

export default function sankeyDiagram () {
  let margin = {top: 100, right: 100, bottom: 100, left: 100}

  // let width = 500
  // let height = 500

  let nodeCustom = d => null
  let linkCustom = d => null
  let linkColor = d => null
  let linkTypeTitle = d => d.type

  let selectedNode = null
  let selectedEdge = null

  const fmt = format('.3s')

  const node = sankeyNode()
  const link = sankeyLink()
        // .linkTitle(linkTitle)

  const listeners = dispatch('selectNode', 'selectGroup', 'selectLink')

  /* Main chart */

  function exports (context) {
    const selection = context.selection ? context.selection() : context

    selection.each(function (G) {
      // Create the skeleton, if it doesn't already exist
      const svg = select(this)

      let sankey = svg.selectAll('.sankey')
            .data([{type: 'sankey'}])

      const sankeyEnter = sankey.enter()
            .append('g')
            .classed('sankey', true)

      sankeyEnter.append('g').classed('groups', true)
      sankeyEnter.append('g').classed('links', true)  // Links below nodes
      sankeyEnter.append('g').classed('nodes', true)
      sankeyEnter.append('g').classed('slice-titles', true)  // Slice titles

      sankey = sankey.merge(sankeyEnter)

      // Update margins
      sankey
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        // .select('.slice-titles')
        // .attr('transform', 'translate(' + margin.left + ',0)')

      // const links = layout.links();
      // if (datum.overrideLinks) {
      //   links.forEach(link => {
      //     const override = datum.overrideLinks[link.id];
      //     if (override && override.r0 !== undefined) link.r0 = override.r0;
      //     if (override && override.r1 !== undefined) link.r1 = override.r1;
      //   });
      // }

      // Groups of nodes
      const nodeMap = map(G.nodes, n => n.id)
      const groups = (G.groups || []).map(g => positionGroup(nodeMap, g));

      // Render
      updateNodes(sankey, context, G.nodes)
      updateLinks(sankey, context, G.links)
      updateGroups(svg, groups);
      // updateSlices(svg, layout.slices(nodes));

      // Events
      svg.on('click', function () {
        listeners.call('selectNode', this, null)
        listeners.call('selectLink', this, null)
      })
    })
  }

  function updateNodes (sankey, context, nodes) {
    var nodeSel = sankey
        .select('.nodes')
        .selectAll('.node')
        .data(nodes, d => d.id)

    nodeSel = nodeSel.merge(
      nodeSel.enter()
        .append('g')
        .attr('class', 'node')
        .on('click', selectNode))

    if (context instanceof transition) {
      nodeSel.transition(context)
        .call(node)
    } else {
      nodeSel.call(node)
    }

    // nodeSel.enter()
    //   .append('g')
    //   .call(node)
    //   .call(nodeCustom)
    //   .classed('node', true)
    //   .on('click', selectNode);

    // getTransition(nodeSel)
    //   .call(node)
    //   .call(nodeCustom);

    nodeSel.exit().remove()
  }

  function updateLinks (sankey, context, edges) {
    var linkSel = sankey
        .select('.links')
        .selectAll('.link')
        .data(edges, d => d.id)

    // ENTER

    var linkEnter = linkSel.enter()
        .append('g')
        .attr('class', 'link')
        .on('click', selectLink)

    linkEnter.append('path')
      .attr('d', link)
      .style('fill', 'white')
      .each(function (d) { this._current = d })

    linkEnter.append('title')

    // UPDATE

    linkSel = linkSel.merge(linkEnter)
    if (context instanceof transition) {
      linkSel
        .transition(context)
        .select('path')
        .style('fill', linkColor)
        .each(function (d) {
          select(this)
            .transition(context)
            .attrTween('d', interpolateLink)
        })
    } else {
      linkSel
        .select('path')
        .style('fill', linkColor)
        .attr('d', link)
    }

    linkSel.select('title')
      .text(linkTitle)
      // .text(function(d) { return 'Flow of ' + d.type + ' from ' + d.source.data.title +
      //                     ' to ' + d.target.data.title + ': ' + d.value; });
    // linkSel.enter()
    //   .append('path')
    //   .call(linkCustom)
    //   .classed('link', true)
    //   .on('click', selectLink);

    // // Update
    // getTransition(linkSel)
    //   .call(link)
    //   .call(linkCustom);

    linkSel.classed('selected', (d) => d.id === selectedEdge)
    linkSel.sort(linkOrder)

    linkSel.exit().remove()
  }

  // function updateSlices(svg, slices) {
  //   var slice = svg.select('.slice-titles').selectAll('.slice')
  //         .data(slices, function(d) { return d.id; });

  //   var textWidth = (slices.length > 1 ?
  //                    0.9 * (slices[1].x - slices[0].x) :
  //                    null);

  //   slice.enter().append('g')
  //     .attr('class', 'slice')
  //     .append('foreignObject')
  //     .attr('requiredFeatures',
  //           'http://www.w3.org/TR/SVG11/feature#Extensibility')
  //     .attr('height', margin.top)
  //     .attr('class', 'title')
  //     .append('xhtml:div')
  //     .style('text-align', 'center')
  //     .style('word-wrap', 'break-word');
  //   // .text(pprop('sliceMetadata', 'title'));

  //   slice
  //     .attr('transform', function(d) {
  //       return 'translate(' + (d.x - textWidth / 2) + ',0)'; })
  //     .select('foreignObject')
  //     .attr('width', textWidth)
  //     .select('div');
  //   // .text(pprop('sliceMetadata', 'title'));

  //   slice.exit().remove();
  // }

  function updateGroups(svg, groups) {
    let group = svg.select('.groups').selectAll('.group')
      .data(groups);

    const enter = group.enter().append('g')
            .attr('class', 'group')
            // .on('click', selectGroup);

    enter.append('rect');
    enter.append('text')
      .attr('x', -10)
      .attr('y', -25);

    group = group.merge(enter)

    group
      .style('display', d => d.title && d.nodes.length > 1 ? 'inline' : 'none')
      .attr('transform', d => `translate(${d.rect.left},${d.rect.top})`)
      .select('rect')
      .attr('x', -10)
      .attr('y', -20)
      .attr('width', d => d.rect.right - d.rect.left + 20)
      .attr('height', d => d.rect.bottom - d.rect.top + 30);

    group.select('text')
      .text(d => d.title);

    group.exit().remove();
  }

  function interpolateLink (b) {
    // XXX should limit radius better
	  b.points.forEach(function (p) {
	  	if (p.ri > 1e3) p.ri = 1e3
	  	if (p.ro > 1e3) p.ro = 1e3
	  })
    var interp = interpolate(linkGeom(this._current), b)
    var that = this
    return function (t) {
      that._current = interp(t)
      return link(that._current)
    }
  }

  function linkGeom (l) {
    return {
      points: l.points,
      dy: l.dy
    }
  }

  function linkOrder (a, b) {
    if (a.id === selectedEdge) return +1
    if (b.id === selectedEdge) return -1
    if (!a.source || a.target && a.target.direction === 'd') return -1
    if (!b.source || b.target && b.target.direction === 'd') return +1
    if (!a.target || a.source && a.source.direction === 'd') return -1
    if (!b.target || b.source && b.source.direction === 'd') return +1
    return a.dy - b.dy
  }

  function linkTitle (d) {
    const parts = []
    const sourceTitle = node.nodeTitle()(d.source)
    const targetTitle = node.nodeTitle()(d.target)
    const matTitle = linkTypeTitle(d)

    parts.push(`${sourceTitle} → ${targetTitle}`)
    if (matTitle) parts.push(matTitle)
    parts.push(fmt(d.value))
    return parts.join('\n')
  }

  function selectLink (d) {
    event.stopPropagation()
    var el = select(this).node()
    listeners.call('selectLink', el, d)
  }

  function selectNode (d) {
    event.stopPropagation()
    var el = select(this).node()
    listeners.call('selectNode', el, d)
  }

  // function selectGroup(d) {
  //   d3.event.stopPropagation();
  //   var el = d3.select(this)[0][0];
  //   dispatch.selectGroup.call(el, d);
  // }

  // function getTransition (sel, t) {
  //   if (duration === null) {
  //     return sel
  //   } else {
  //     return sel.transition(t)
  //   }
  // }

  /* Public API */
  // exports.width = function(_x) {
  //   if (!arguments.length) return width;
  //   width = parseInt(_x, 10);
  //   return this;
  // };

  // exports.height = function(_x) {
  //   if (!arguments.length) return height;
  //   height = parseInt(_x, 10);
  //   return this;
  // };

  exports.margins = function (_x) {
    if (!arguments.length) return margin
    margin = {
      top: _x.top === undefined ? margin.top : _x.top,
      left: _x.left === undefined ? margin.left : _x.left,
      bottom: _x.bottom === undefined ? margin.bottom : _x.bottom,
      right: _x.right === undefined ? margin.right : _x.right
    }
    return this
  }

  // exports.duration = function(_x) {
  //   if (!arguments.length) return duration;
  //   duration = _x === null ? null : parseFloat(_x);
  //   return this;
  // };

  // exports.linkValue = function(_x) {
  //   if (!arguments.length) return layout.linkValue();
  //   layout.linkValue(_x);
  //   return this;
  // };

  // Node styles and title

  exports.nodeTitle = function (_x) {
    if (!arguments.length) return node.nodeTitle()
    node.nodeTitle(_x)
    return this
  }

  exports.node = function (_x) {
    if (!arguments.length) return nodeCustom
    nodeCustom = _x
    return this
  }

  // Link styles and titles

  exports.linkTypeTitle = function (_x) {
    if (!arguments.length) return linkTypeTitle
    // linkTypeTitle = d3.functor(_x)
    linkTypeTitle = _x
    return this
  };

  exports.linkColor = function (_x) {
    if (!arguments.length) return linkColor
    linkColor = _x
    return this
  };

  exports.linkMinWidth = function (_x) {
    if (!arguments.length) return link.minWidth()
    link.minWidth(_x)
    return this
  };

  exports.link = function (_x) {
    if (!arguments.length) return linkCustom
    linkCustom = _x
    return this
  };

  // exports.scale = function(_x) {
  //   if (!arguments.length) return layout.scale();
  //   layout.scale(_x);
  //   return this;
  // };

  exports.selectNode = function (_x) {
    selectedNode = _x
    return this
  }

  exports.selectLink = function (_x) {
    selectedEdge = _x
    return this
  }

  exports.on = function () {
    var value = listeners.on.apply(listeners, arguments)
    return value === listeners ? exports : value
  }

  return exports
}

// function nodeSeparation(a, b, G) {
//   const a0 = G.inEdges(a).map(e => e.v),
//         b0 = G.inEdges(b).map(e => e.v),
//         a1 = G.outEdges(a).map(e => e.w),
//         b1 = G.outEdges(b).map(e => e.w);
//   let k = 0, n = 0, i;

//   for (i = 0; i < b0.length; ++i) {
//     ++n;
//     if (a0.indexOf(b0[i]) !== -1) ++k;
//   }
//   for (i = 0; i < a0.length; ++i) {
//     ++n;
//     if (b0.indexOf(a0[i]) !== -1) ++k;
//   }
//   for (i = 0; i < b1.length; ++i) {
//     ++n;
//     if (a1.indexOf(b1[i]) !== -1) ++k;
//   }
//   for (i = 0; i < a1.length; ++i) {
//     ++n;
//     if (b1.indexOf(a1[i]) !== -1) ++k;
//   }

//   if (n === 0) { return 1; }
//   return 1 - 0.6 * k / n;
// }


// function createGroups (svg) {
//   const sankeyEnter = svg.enter().append('svg')
//           .append('g')
//           .classed('sankey', true)
//   sankeyEnter.append('g').classed('groups', true)
//   sankeyEnter.append('g').classed('links', true)  // Links below nodes
//   sankeyEnter.append('g').classed('nodes', true)
//   sankeyEnter.append('g').classed('slice-titles', true)  // Slice titles
// }

