let model_v = new Float32Array(9),
	model_n = new Float32Array(9),
	model_uv = new Float32Array(9);

// async function model_load(path) {
// 	return new Uint16Array(await (await fetch(path)).arrayBuffer());
// }

async function model_load_container(path) {
	/* Parse Retarded Model Format Container (.rmfc)
		struct {
			uint16_t num_models;
			uint16_t num_bytes[num_models];
			uint16_t data[];
		} rmf_container_data;
	*/
	let data = new Uint16Array(await (await fetch(path)).arrayBuffer()),
		models = [],
		start_index = data[0]+1;
	for (let i = 0; i < data[0]; i++) {
		let end_index = start_index + data[i+1]/2;
		models.push(data.subarray(start_index, end_index));
		start_index = end_index;
	}
	return models;
}

function model_init(data, scale, tile) {
	/* Parse Retarded Model Format (.rmf):
		struct {
			uint8_t num_frames;
			uint8_t num_verts; // per frame
			uint16_t num_indices;
			struct {
				uint8_t reserved : 1;
				int8_t x : 5;
				int8_t y : 5;
				int8_t z : 5;
			} verts[num_frames * num_verts];
			struct {
				uint8_t a_address_inc : 2;
				uint8_t b_index : 7;
				uint8_t c_index : 7;
			} indices[num_indices];
		} rmf_data;
	*/

	// Load header, prepare buffers
	let num_frames = data[0] & 0xff,
		num_vertices = data[0] >> 8,
		num_indices = data[1],
		vertices = new Float32Array(num_vertices * num_frames*3),
		normals = new Float32Array(num_vertices * num_frames*3),
		indices = new Uint8Array(num_indices*3),

		// Keep track of the index count per vertex, so we can average the
		// vertex normals.
		indices_per_vert = new Uint8Array(num_vertices * num_frames),

		index_increment = 0,
		offset = 2,

	// Load vertices, 3x 5bit, center on origin (-15), scale, find the 
	// min/max x and y to compute our tile size accordingly.
		min_x = 16,
		max_x = -16,
		min_y = 16,
		max_y = -16;
	for (let i = 0; i < num_vertices * num_frames * 3; i += 3) {
		let short = data[offset++];
		vertices[i] = ((short >> 10) - 15) * scale;
		vertices[i+1] = (((short >> 5) & 31) - 15) * scale;
		vertices[i+2] = (((short) & 31) - 15) * scale;
		if (i < num_vertices*3) {
			min_x = Math.min(min_x, vertices[i]);
			max_x = Math.max(max_x, vertices[i]);
			min_y = Math.min(min_y, vertices[i+1]);
			max_y = Math.max(max_y, vertices[i+1]);
		}
	}
	
	// Load indices, 1x 2bit increment, 2x 7bit absolute
	for (let i = 0; i < num_indices * 3; i += 3) {
		let short = data[offset++];
		index_increment += short >> 14;
		indices[i] = index_increment;
		indices[i+1] = (short >> 7) & 127;
		indices[i+2] = (short) & 127;
	}

	// Compute normals for each frame and face
	for (let frame = 0; frame < num_frames; frame++) {
		for (let i = 0; i < num_indices * 3; i+=3) {
			let index1 = indices[i]*3,
				index2 = indices[i+1]*3,
				index3 = indices[i+2]*3,
				n = face_normal(
					vertices[index2], vertices[index2+1], vertices[index2+2],
					vertices[index1], vertices[index1+1], vertices[index1+2],
					vertices[index3], vertices[index3+1], vertices[index3+2],
				);

			// For each vertex in this face, add and average the face normal to
			// the vertex normal
			for (let vertex_in_face = 0; vertex_in_face < 3; vertex_in_face++) {
				let vertex_index = indices[i+vertex_in_face],
					offset = frame * num_vertices + vertex_index,
					fv = (++indices_per_vert[offset]),
					fvi = fv+1;
				for (let p = 0; p < 3; p++) {
					normals[offset*3+p] = (normals[offset*3+p] * fv + n[p])/fvi;
				}
			}
		}
	}

	// UV coords in tile space and width/height as fraction of model size
	let uf = 1 / (max_x - min_x) * R_TILE_FRACTION,
		u = tile * R_TILE_FRACTION -min_x * uf,
		vf = 1 / (max_y - min_y),
		v = max_y * vf;


	// Push a rotated, scaled and keyframe interpolated model to the render
	// buffer
	return function(x, y, z, rotation, frame1, frame2, mix, skip_indices) {
		let cs = Math.cos(rotation||0),
			sn = Math.sin(rotation||0),
			f1 = (frame1||0) * num_vertices * 3,
			f2 = (frame2||0) * num_vertices * 3;

		mix = mix || 0;
		for (let i = 0; i < (num_indices - (skip_indices||0)) * 3; i+=3) {
			// Load all vertices and normals into the temp buffers. We always
			// load the vertices from the first frame too, to compute our uv
			// coords.
			for (let fv = 0, o = 0; fv < 3; fv++) {
				let idx = indices[i+fv] * 3;
				for (let p = 0; p < 3; p++, o++) {
					model_v[o] = lerp(vertices[f1 + idx + p], vertices[f2 + idx + p], mix);
					model_n[o] = lerp(normals[f1 + idx + p], normals[f2 + idx + p], mix);
					model_uv[o] = vertices[idx+p];
				}
			}

			// Rotate around y axis and write everything into the render buffer
			r_buffer.set([
				x + model_v[0] * cs - model_v[2] * sn,
				y + model_v[1],
				z + model_v[0] * sn + model_v[2] * cs,
				u + model_uv[0] * uf,
				v - model_uv[1] * vf,
				model_n[0] * cs - model_n[2] * sn,
				model_n[1],
				model_n[0] * sn + model_n[2] * cs,

				x + model_v[3] * cs - model_v[5] * sn,
				y + model_v[4],
				z + model_v[3] * sn + model_v[5] * cs,
				u + model_uv[3] * uf,
				v - model_uv[4] * vf,
				model_n[3] * cs - model_n[5] * sn,
				model_n[4],
				model_n[3] * sn + model_n[5] * cs,

				x + model_v[6] * cs - model_v[8] * sn,
				y + model_v[7],
				z + model_v[6] * sn + model_v[8] * cs,
				u + model_uv[6] * uf,
				v - model_uv[7] * vf,
				model_n[6] * cs - model_n[8] * sn,
				model_n[7],
				model_n[6] * sn + model_n[8] * cs
			], r_num_verts * 8);
			r_num_verts += 3;
		}
	}
}