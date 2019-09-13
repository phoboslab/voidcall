
// Allocate node information ahead of time. This way we don't have to create
// anything at run time, making things a lot faster.

let astar_nodes_parent = new Uint16Array(MAP_SIZE * MAP_SIZE),
	astar_nodes_state = new Uint8Array(MAP_SIZE * MAP_SIZE),
	astar_nodes_g = new Float32Array(MAP_SIZE * MAP_SIZE),
	astar_nodes_f = new Float32Array(MAP_SIZE * MAP_SIZE),
	astar_open_nodes = new Uint16Array(MAP_SIZE * 4), // Should be enough!
	astar_num_open_nodes = 0,

	ASTAR_NEIGHBORS = [
		-1-MAP_SIZE, -MAP_SIZE, 1-MAP_SIZE,
		-1,                     1,
		-1+MAP_SIZE,  MAP_SIZE, 1+MAP_SIZE
	],

	ASTAR_STATE_UNKNOWN = 0,
	ASTAR_STATE_OPEN = 1,
	ASTAR_STATE_CLOSED = 2;

function astar_cost_estimate(current_addr, destination_addr) {
	let x = (current_addr & 0xff) - (destination_addr & 0xff),
		z = (current_addr >> 8) - (destination_addr >> 8);
	return Math.sqrt(x*x + z*z);
}

function astar_set_node(addr, parent, g, f) {
	astar_nodes_parent[addr] = parent;
	astar_nodes_state[addr] = ASTAR_STATE_OPEN;
	astar_nodes_g[addr] = g;
	astar_nodes_f[addr] = f;
}

function astar_get_path(sx, sz, dx, dz) {
	let start_addr = (sz>>3) * MAP_SIZE + (sx>>3),
		dest_addr = (dz>>3) * MAP_SIZE + (dx>>3),
		path_addr = astar_get_dest_address(start_addr, dest_addr),
		path = [];

	// Walk up from the target address to all parents
	while (path_addr >= 0 && path_addr != start_addr) {
		let sx = path_addr & 0xff,
			sz = path_addr >> 8,
			path_addr_next = astar_nodes_parent[path_addr];

		// Condense all points to straight lines
		while (
			path_addr_next >= 0 && 
			path_addr_next != start_addr && 
			!map_trace(sx, sz, path_addr_next & 0xff, path_addr_next >> 8)
		) {
			path_addr_next = astar_nodes_parent[path_addr_next];
		}

		// Add center pixel position of this tile to the front of the final path
		path.unshift({
			x: sx * 8 + 4,
			z: sz * 8 + 4
		});
		path_addr = path_addr_next;
	}
	return path;
}

function astar_get_dest_address(start_addr, dest_addr) {
	astar_nodes_state.fill(ASTAR_STATE_UNKNOWN);
	
	astar_set_node(dest_addr, 0, 0, 0);
	astar_set_node(start_addr, 0, 0, 0);
	
	astar_open_nodes[0] = start_addr;
	astar_num_open_nodes = 1;
	while (astar_num_open_nodes--) {
		let current_addr = astar_open_nodes[astar_num_open_nodes];

		// Did we reach the destination?
		if (current_addr == dest_addr) {
			return current_addr;
		}

		astar_nodes_state[current_addr] = ASTAR_STATE_CLOSED;

		// Search all direct neighbors
		for (let i = 0; i < ASTAR_NEIGHBORS.length; i++) {
			let neighbor_addr = current_addr + ASTAR_NEIGHBORS[i],
				state = astar_nodes_state[neighbor_addr];

			// If we already visited this node or its not traversable, reject it
			if (state == ASTAR_STATE_CLOSED || map_collision[neighbor_addr]) {
				continue;
			}

			// New node? Compute cost and insert into open list
			if (!state || neighbor_addr == dest_addr) {
				let g = astar_nodes_g[current_addr] + 
						astar_cost_estimate(current_addr, neighbor_addr),
					f = g + astar_cost_estimate(neighbor_addr, dest_addr);
				astar_set_node(neighbor_addr, current_addr, g, f);

				// Linear search through the open nodes for the right spot to
				// insert (sorted by cost). This turned out faster than a binary
				// search AND is less code.
				let n = 0;
				while(
					n < astar_num_open_nodes &&
					astar_nodes_f[astar_open_nodes[n]] > f
				) { n++; }
				astar_open_nodes.copyWithin(n+1, n, astar_num_open_nodes);
				astar_open_nodes[n] = neighbor_addr;
				astar_num_open_nodes++;
			}
		}
	}

	return -1;
}
