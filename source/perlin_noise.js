function perlin_noise_generate_func(size) {
	let gx = new Float32Array(size),
		gy = new Float32Array(size),
		p = new Uint16Array(size);
	
	for (var i = 0; i < size; i++) {
		gx[i] = random_float()*2-1;
		gy[i] = random_float()*2-1;
		p[i] = i;
	}
	
	// Shuffle Array
	for (let i = p.length - 1; i > 0; i--) {
		let j = random_int(0, i + 1),
			temp = p[j];
		p[j] = p[i];
		p[i] = temp;
	}

	return function(x, y) {
		// Compute what gradients to use
		let qx0 = x | 0,
			qx1 = qx0 + 1,
			tx0 = x - qx0,
			tx1 = tx0 - 1,
	
			qy0 = y | 0,
			qy1 = qy0 + 1,
			ty0 = y - qy0,
			ty1 = ty0 - 1;
	
		// Make sure we don't come outside the lookup table
		qx0 = qx0 % size;
		qx1 = qx1 % size;
	
		qy0 = qy0 % size;
		qy1 = qy1 % size;
	
		// Permutate values to get pseudo randomly chosen gradients
		let q00 = p[(qy0 + p[qx0]) % size],
			q01 = p[(qy0 + p[qx1]) % size],
	
			q10 = p[(qy1 + p[qx0]) % size],
			q11 = p[(qy1 + p[qx1]) % size],
	
		// Compute the dotproduct between the vectors and the gradients
			v00 = gx[q00] * tx0 + gy[q00] * ty0,
			v01 = gx[q01] * tx1 + gy[q01] * ty0,
	
			v10 = gx[q10] * tx0 + gy[q10] * ty1,
			v11 = gx[q11] * tx1 + gy[q11] * ty1,
	
		// Modulate with the weight function
			wx = (3 - 2 * tx0) * tx0 * tx0,
			v0 = v00 - wx * (v00 - v01),
			v1 = v10 - wx * (v10 - v11),
	
			wy = (3 - 2 * ty0) * ty0 * ty0,
			v = v0 - wy * (v0 - v1);
	
		return v;
	}
}