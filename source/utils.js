
function lerp(a, b, t) {
	return a + (b - a) * t;
}

function face_normal(x0, y0, z0, x1, y1, z1, x2, y2, z2) {
	let a0 = x0 - x1,
		a1 = y0 - y1,
		a2 = z0 - z1,
		b0 = x2 - x1,
		b1 = y2 - y1,
		b2 = z2 - z1,
		pn0 = a1 * b2 - a2 * b1,
		pn1 = a2 * b0 - a0 * b2,
		pn2 = a0 * b1 - a1 * b0,
		len = Math.sqrt(pn0 * pn0 + pn1 * pn1 + pn2 * pn2);
	return [
		pn0/len,
		pn1/len,
		pn2/len
	];
}

let random_high, random_low;

function random_float() {
	random_high = (
			(random_high << 16) + (random_high >> 16) + random_low
		) & 0xffffffff;
	random_low = (random_low + random_high) & 0xffffffff;
	return (random_high >>> 0) / 0xffffffff;
}

function random_int(min, max) {
	return (min + random_float() * (max-min+1))|0;
}

function random_seed(seed) {
	random_high = seed || 0xBADC0FFE;
	random_low = seed ^ 0x49616E42;
}

function random_element(array) {
	return array[random_int(0, array.length-1)];
}

function distance_squared(ax, az, bx, bz) {
	let dx = ax - bx,
		dz = az - bz;
	return (dx*dx + dz*dz);
}