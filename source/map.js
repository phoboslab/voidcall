let map_height = new Float32Array(MAP_SIZE * MAP_SIZE),
	map_collision = new Uint8Array(MAP_SIZE * MAP_SIZE);

function map_generate(seed) {
	random_seed(seed);

	// Create an offscreen canvas for further processing
	let noise = perlin_noise_generate_func(1024),
		canvas = document.createElement('canvas'),
		ctx = canvas.getContext('2d');

	canvas.width = canvas.height = MAP_SIZE;

	// Build the basic, 1bit geometry of walkable space and mountains; draw into
	// the offscreen canvas. Always force steep walls around the map edges.
	for (let y = 0, i = 0; y < MAP_SIZE; y++) {
		for (let x = 0; x < MAP_SIZE; x++, i++) {
			let near_edge = Math.max(0,8-y,y-(MAP_SIZE-8), 8-x, x-(MAP_SIZE-8)),
				n1 = noise(x/35, y/35),
				n2 = noise(x/50, y/50);

			ctx.fillStyle = (
					n1 * 90 + n2 * 200 +
					near_edge * 100 * (n1+3)
				) > 7 
					? '#fff'
					: '#000';
			ctx.fillRect(x,y,1,1);
		}
	}

	// Hack to make the bottom right part of the map accessible; otherwise we'd
	// have a pocket for pathfinding where enemies can get stuck :/
	ctx.fillStyle = '#000';
	ctx.fillRect(230, 193, 20, 30);
	

	// Simple blur, drawing the 1bit map_height 16 times over itself itself
	ctx.globalAlpha = 0.2;
	for (let x = -2; x < 2; x++) {
		for (let y = -2; y < 2; y++) {
			ctx.drawImage(canvas, x, y);
		}
	}

	// Get the canvas pixels with the smoothed terrain
	let image_data = ctx.getImageData(0, 0, MAP_SIZE, MAP_SIZE),
		px = image_data.data;

	
	// Build the cosmetic terrain features and write into the collision map
	// and height map. Keep track of the min/max height so we can scale the
	// height accordingly when rendering.
	let min = Infinity,
		max = -min;
	for (let y = 0, i = 0; y < MAP_SIZE; y++) {
		for (let x = 0; x < MAP_SIZE; x++, i++) {
			let
				coarse = px[(y*MAP_SIZE+x)*4],
				mid = noise(x/12, y/12) * 8,
				fine = 
					noise(x/30, y/30) * 4 +
					noise(x/10, y/10) * 2 +
					noise(x/5, y/5) + 
					noise(x/3, y/3),
				v = 
					coarse * 6 + // Basic map_height
					fine * 300 + // Details on everything
					mid * 5 + // Mids on everything
					(coarse * (mid+5)) * 2.5 + // Extra mids on hills
					(coarse * (fine+1)) * 1.5 + // Extra details on hills
					((255-coarse) * mid*-1)*0.5; // Inverted mids in valleys

			min = Math.min(min, v);
			max = Math.max(max, v);
			map_collision[i] = coarse ? 255 :0;
			map_height[y * MAP_SIZE + x] = v;
		}
	}

	// Normalize into 0 -- MAP_HEIGHT range
	for (let i = 0; i < map_height.length; i++) {
		map_height[i] = ((map_height[i]-min)/(max-min)) * MAP_HEIGHT;
	}

	// Push the map_height to the render buffer
	for (let z = 0, index = 0; z < MAP_SIZE; z++) {
		for (let x = 0; x < MAP_SIZE; x++, index++) {
			let tile = random_int(0,1),
				vx = x * TILE_SIZE,
				vy1 = map_height[index],
				vy2 = map_height[(index+1)],
				vy3 = map_height[(index+MAP_SIZE)],
				vy4 = map_height[(index+MAP_SIZE+1)],
				vz = z * TILE_SIZE;
			r_push_quad(
				vx, vy1, vz, 
				vx + TILE_SIZE, vy2, vz,
				vx, vy3, vz + TILE_SIZE, 
				vx + TILE_SIZE, vy4, vz + TILE_SIZE,
				tile
			);
		}
	}

	// This averages the normals of all adjacent vetices, so we have a smooth
	// shaded terrain. It goes through the (otherwise complete) buffer and
	// modifies all normal vectors in place. This is a really dumb way to do
	// this - it's tightly dependend on the buffer layout and a pain to debug.
	// I suspect it's still not correct.

	// Neighbor address offsets:
	// [tile offset in map, vertex offset in buffer]
	let neighbors = [
		0, 5, // top left tile, bottom right vertex
		1, 2, // top right tile, bottom left vertex
		1, 4, // top right tile, bottom left vertex 2
		MAP_SIZE, 1, // bottom left tile, top right vertex
		MAP_SIZE, 3, // bottom left tile, top right vertex 2
		MAP_SIZE+1, 0 // bottom right tile, top left vertex
	];
	for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
		for (let p = 0; p < 3; p++) { // [nx, ny, nz]
			let sum = 0;
			for (let n = 0; n < 12; n+=2) {
				sum += r_buffer[((i + neighbors[n]) * 6 + neighbors[n+1]) * 8 + 5 + p];
			}
			for (let n = 0; n < 12; n+=2) {
				r_buffer[((i + neighbors[n]) * 6 + neighbors[n+1]) * 8 + 5 + p] = sum/6;
			}
		}
	}

	// Flush the heightmap to a static buffer
	r_push_static_buffer();

	// Add cosmetic terrain models and push to another static buffer
	map_place_model(2000, 4, 2, 2, 7, 255); // Trees
	map_place_model(5000, 6, 0.15, 2, 1, 0); // Grass
	map_place_model(100, 7, 0.5, 3, 2, 255); // Boulders big
	map_place_model(200, 7, 0.1, 3, 2, 0); // Boulders small
	r_push_static_buffer();
}

function map_place_model(count, model_index, scale, tile, yoff, collision) {
	let model = model_init(model_data[model_index], scale, tile);
	for (var i = 0; i < count; i++) {
		let x = random_int(0,MAP_SIZE)*8,
			z = random_int(0,MAP_SIZE)*8,
			rotation = random_float()*Math.PI*2;
		if (!map_get_collision(x, z)) {
			model(x+6,map_get_height(x, z)+yoff,z+5, rotation);
			map_set_collision(x, z, collision);
		}
	}
}

function map_get_height(x, z) {
	let tx = (x/TILE_SIZE)|0,
		tz = (z/TILE_SIZE)|0,
		xw = (x - tx*TILE_SIZE)/TILE_SIZE,
		zw = (z - tz*TILE_SIZE)/TILE_SIZE;

	let c00 = map_height[tz * MAP_SIZE + tx],
		c10 = map_height[tz * MAP_SIZE + tx+1],
		c01 = map_height[(tz+1) * MAP_SIZE + tx],
		c11 = map_height[(tz+1) * MAP_SIZE + tx+1];

	// Bilinear interpolation on the target quad
	return lerp(
		lerp(c00, c10, xw), 
		lerp(c01, c11, xw),
		zw
	);
}

function map_get_collision(x, z) {
	return map_collision[((z/TILE_SIZE)|0) * MAP_SIZE + ((x/TILE_SIZE)|0)];
}

function map_set_collision(x, z, set) {
	map_collision[((z/TILE_SIZE)|0) * MAP_SIZE + ((x/TILE_SIZE)|0)] = set;
}

function map_trace(sx, sz, dx, dz) {
	let steps = Math.max(Math.abs(sx-dx), Math.abs(sz - dz)),
		step_x = (dx-sx) / steps,
		step_z = (dz-sz) / steps;
	for (let i = 0; i < steps; i++) {
		if (map_collision[(sz|0) * MAP_SIZE + (sx|0)]) {
			return true;
		}
		sx += step_x;
		sz += step_z;
	}
	return false;
}