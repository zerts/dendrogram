import * as d3 from 'd3'
import React, { Component } from 'react';
import './App.css';
import data from './data';

class App extends Component {
	node = null;

	getRef = (node) => {
		this.node = node;
	};

	componentDidMount() {
		this.createDendrogram();
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
		this.createDendrogram();
	}

	createDendrogram = () => {
		console.log(data);
		let nodeWidth = 220;
		let dx = 70;
		let margin = ({
			top: 10 + (dx / 2),
			right: 120,
			bottom: 10 + (dx / 2),
			left: 40 + nodeWidth
		});
		let width = window.innerWidth;
		let dy = 350;

		let tree = d3.tree().nodeSize([dx, dy]);

		let linkStepCurve = ({source, target}) => {
			return "M" + source.y + "," + source.x
				+ "L" + ((source.y * 4 + target.y * 1) / 5) + "," + source.x
				+ "L" + ((source.y * 4 + target.y * 1) / 5) + "," + target.x
				+ "L" + target.y + "," + target.x;
		};

		const root = d3.hierarchy(data);

		root.x0 = dy / 2;
		root.y0 = 0;
		root.descendants().forEach((d, i) => {
			d.id = i;
			d._children = d.children;
			if (d.depth && d.data.name.length !== 7) d.children = null;
		});

		// const oldSvg = d3.select(this.node);
		// oldSvg.selectAll('.g-main').remove();

		const svg = d3.select(this.node)
			.attr('width', width)
			.attr('height', dx)
			.attr('viewBox', [-margin.left, -margin.top, width, dx])
			.style('font', '10px sans-serif')
			.style('user-select', 'none');
		// .append('g')
		// .classed('g-main', true);


		const gLink = svg.append('g')
			.attr('fill', 'none')
			.attr('stroke', '#555')
			.attr('stroke-opacity', 1)
			.attr('stroke-width', 1.5);

		const gNode = svg.append('g')
			.attr('cursor', 'pointer');

		const update = (source) => {
			const duration = d3.event && d3.event.altKey ? 2500 : 250;
			const nodes = root.descendants().reverse();
			const links = root.links();

			// Compute the new tree layout.
			tree(root);

			let left = root;
			let right = root;

			let leftY = root;
			let rightY = root;
			root.eachBefore(node => {
				if (node.x < left.x) {
					left = node;
				}
				if (node.x > right.x) {
					right = node;
				}
				if (node.y < leftY.y) {
					left = node;
				}
				if (node.y > rightY.y) {
					rightY = node;
				}
			});

			const height = right.x - left.x + margin.top + margin.bottom;
			const newWidth = Math.max(width, rightY.y - leftY.y + margin.left + margin.right);

			const transition = svg.transition()
				.duration(duration)
				.attr('width', newWidth)
				.attr('height', height)
				.attr('viewBox', [-margin.left, left.x - margin.top, width, height])
				.tween('resize', window.ResizeObserver ? null : () => () => svg.dispatch('toggle'));

			// Update the nodes…
			const node = gNode.selectAll('g')
				.data(nodes, d => d.id);

			// Enter any new nodes at the parent's previous position.
			const nodeEnter = node.enter().append('g')
				.attr('transform', d => `translate(${source.y0},${source.x0})`)
				.attr('fill-opacity', 0)
				.attr('stroke-opacity', 0);
				// .on('click', d => {
				// 	d.children = d.children ? null : d._children;
				// 	update(d);
				// });

			nodeEnter.append('circle')
				.attr('r', 2.5)
				.attr('fill', d => d._children ? '#555' : '#999');

			nodeEnter.append('text')
				.attr('dy', '0.31em')
				.attr('x', d => d._children ? -6 : 6)
				.attr('text-anchor', d => d._children ? 'end' : 'start')
				// .text(d => d.data.name)
				.clone(true).lower()
				.attr('stroke-linejoin', 'round')
				.attr('stroke-width', 3)
				.attr('stroke', 'white');

			let nodeDiv = nodeEnter.append('foreignObject')
				.attr('x', -nodeWidth - 10)
				.attr('y', -(dx - 10) / 2)
				.attr('width', 250)
				.attr('height', 70)
				.append('xhtml:div')
				.append('div')
				.attr('class', 'node');

			nodeDiv.append('text')
				.text(d => d.data.name);
			nodeDiv.append('text')
				.attr('class', d => d.data.connection ? 'node-link' : 'd-none')
				.text(d => d.data.connection);
			nodeDiv.append('div')
				.attr('class', 'node-collapse')
				.attr('style', d => `display: ${d._children ? 'inherit' : 'none'}`)
				.text('+')
				.on('click', d => {
					d.children = d.children ? null : d._children;
					update(d);
				});

			// Transition nodes to their new position.
			const nodeUpdate = node.merge(nodeEnter).transition(transition)
				.attr('transform', d => `translate(${d.y},${d.x})`)
				.attr('fill-opacity', 1)
				.attr('stroke-opacity', 1);

			// Transition exiting nodes to the parent's new position.
			const nodeExit = node.exit().transition(transition).remove()
				.attr('transform', d => `translate(${source.y},${source.x})`)
				.attr('fill-opacity', 0)
				.attr('stroke-opacity', 0);

			// Update the links…
			const link = gLink.selectAll('path')
				.data(links, d => d.target.id);

			// Enter any new links at the parent's previous position.
			const linkEnter = link.enter()
				.append('path')
				.attr('d', d => {
					const o = {
						x: d.source.x0,
						y: d.source.y0
					};
					// console.log(d);
					return linkStepCurve({
						source: o,
						target: o
					});
				});

			// Transition links to their new position.
			link.merge(linkEnter).transition(transition)
				.attr('d', linkStepCurve);

			// Transition exiting nodes to the parent's new position.
			link.exit().transition(transition).remove()
				.attr('d', d => {
					const o = {
						x: d.source.x,
						y: d.source.y
					};
					return linkStepCurve({
						source: o,
						target: o
					});
				});

			// Stash the old positions for transition.
			root.eachBefore(d => {
				d.x0 = d.x;
				d.y0 = d.y;
			});
		};

		update(root);
	};

	render() {
		return <svg ref={this.getRef}/>
	}

}

export default App;
