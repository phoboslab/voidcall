let
	gl = (c.getContext('webgl') || c.getContext('experimental-webgl')),

	R_TILE_FRACTION = TEXTURE_TILE_SIZE / TEXTURE_SIZE,
	R_PX_NUDGE = 0.5 / TEXTURE_SIZE,
	
	R_MAX_VERTS = 1024 * 512, // allow 512k verts max
	R_MAX_LIGHTS = 16,

	R_PROJECTION_F = 1 / Math.tan((45/*FOV*//180)*Math.PI / 2),

	R_SHADER_VARYING = 
		'precision highp float;' +
		'varying vec3 vp;' +
		'varying vec2 vuv;'+
		'varying vec3 vn;',
	R_SHADER_ATTRIBUTE_VEC = 'attribute vec',
	R_SHADER_UNIFORM = 'uniform ',

	R_SOURCE_VS_HEAD = 
		R_SHADER_VARYING + 
		R_SHADER_ATTRIBUTE_VEC + "3 p;" +
		R_SHADER_ATTRIBUTE_VEC + "2 uv;" +
		R_SHADER_ATTRIBUTE_VEC + "3 n;" +
		R_SHADER_UNIFORM + "vec4 cam;" + // (x, y z, w = aspect)
		R_SHADER_UNIFORM + "float l[7*"+R_MAX_LIGHTS+"];" +
		"void main(void){" +
			"gl_Position=" +
				"mat4("+R_PROJECTION_F+",0,0,0,0,"+R_PROJECTION_F+"*cam.w,0,0,0,0,-1,-1,0,0,-2,0)*"+ // projection
				// view rotation: glMatrix.mat4.fromRotation([], (35/180)*Math.PI, [1,0,0]).toString();
				"mat4(1,0,0,0,0,0.819,0.573,0,0,-0.573,0.819,0,0,0,0,1)*"+ 
				"(vec4(p+cam.xyz,1.));" +
			"vn=n;" +
			"vuv=uv;",


	// Final Render Shader
	R_SOURCE_RENDER_VS = 
		R_SOURCE_VS_HEAD +
			"vp=p;" +
		"}",

	R_SOURCE_RENDER_FS_HEAD = 
		R_SHADER_VARYING + 
		R_SHADER_UNIFORM + "sampler2D s;" +
		R_SHADER_UNIFORM + "float l[7*"+R_MAX_LIGHTS+"];" +
		"void main(void){" +
			"vec4 t=texture2D(s,vuv);" +
			"if(t.a==0.0)" + // discard alpha
				"discard;" + 
			"else{" +  // calculate color with lights and fog
				"vec3 vl=vec3(0.2,0.2,0.2);" + // ambient color
				"for(int i=0;i<"+R_MAX_LIGHTS+";i++) {"+
					"vec3 lp=vec3(l[i*7],l[i*7+1],l[i*7+2]);" + // light position
					"vl+=vec3(l[i*7+3],l[i*7+4],l[i*7+5])" + // light color *
						"*max(dot(vn,normalize(lp-vp)),0.)" + // diffuse *
						"*(1./(l[i*7+6]*(" + // attentuation *
							"length(lp-vp)" + // distance
						")));" + 
				"}",

	R_SOURCE_RENDER_TERRAIN_FS =
		R_SOURCE_RENDER_FS_HEAD +
				"float d=(t.r*0.3+t.g*0.6+t.b*0.11);" + // desaturated color
				"t.rgb=mix(t.rgb,vec3(d,d,d),(vp.y*0.02-0.2));" + // desaturate based on y pos
				"gl_FragColor=t*vec4(vl,t.a);" +
			"}" +
		"}",

	R_SOURCE_RENDER_OBJECTS_FS = 
		R_SOURCE_RENDER_FS_HEAD +
		"gl_FragColor=t*vec4(vl,t.a);" +
			"}" +
		"}",

	// Shader for rendering world coords as distinct colors
	R_SOURCE_COORDS_VS = 
		R_SOURCE_VS_HEAD + 
			"vp=vec3(p.x+cam.x, p.y, p.z+cam.z);" +
		"}",
	R_SOURCE_COORDS_FS =
		R_SHADER_VARYING + 
		"void main(void){" +
			"gl_FragColor=vec4(" +
				"vp.x/512.0+0.5," +
				"vp.y/"+MAP_HEIGHT+".0," +
				"vp.z/512.0+1.2," +
				"1.0"+
			");"+
		"}",

	r_width,
	r_height,

	r_num_verts = 0,
	r_buffer = new Float32Array(R_MAX_VERTS*8), // 8 properties per vert
	r_num_deferred_verts = 0,
	r_buffer_deferred = new Float32Array(8*1024*8), 

	r_num_lights = 0,
	r_light_buffer = new Float32Array(R_MAX_LIGHTS*7), // 7 properties per light

	r_shader_coords,
	r_shader_render_terrain,
	r_shader_render_objects,

	r_glbuffer_dynamic,
	r_glbuffer_static = [],

	mouse_world_x = 0,
	mouse_world_y = 0,
	mouse_world_z = 0;


function r_init() {
	// Create shorthand WebGL function names
	// let webglShortFunctionNames = {};
	for (let name in gl) {
		if (gl[name].length != undefined) {
			gl[name.match(/(^..|[A-Z]|\d.|v$)/g).join('')] = gl[name];
			// webglShortFunctionNames[name] = 'gl.'+name.match(/(^..|[A-Z]|\d.|v$)/g).join('');
		}
	}
	// console.log(JSON.stringify(webglShortFunctionNames, null, '\t'));

	r_glbuffer_dynamic = gl.createBuffer();
	r_shader_coords = r_create_shader(R_SOURCE_COORDS_VS, R_SOURCE_COORDS_FS);
	r_shader_render_terrain = r_create_shader(R_SOURCE_RENDER_VS, R_SOURCE_RENDER_TERRAIN_FS);
	r_shader_render_objects = r_create_shader(R_SOURCE_RENDER_VS, R_SOURCE_RENDER_OBJECTS_FS);
	
	window.onresize = r_resize;
	r_resize();
}

function r_create_shader(vertex_shader_source, fragment_shader_source, attribs) {
	let shader_program = gl.createProgram();
	gl.attachShader(shader_program, r_compile_shader(gl.VERTEX_SHADER, vertex_shader_source));
	gl.attachShader(shader_program, r_compile_shader(gl.FRAGMENT_SHADER, fragment_shader_source));
	gl.linkProgram(shader_program);
	gl.useProgram(shader_program);

	let camera_uniform = gl.getUniformLocation(shader_program, "cam"),
		light_uniform = gl.getUniformLocation(shader_program, "l");

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	return {
		p: shader_program,
		c: camera_uniform,
		l: light_uniform
	};
}

function r_compile_shader(shader_type, shader_source) {
	let shader = gl.createShader(shader_type);
	gl.shaderSource(shader, shader_source);
	gl.compileShader(shader);
	return shader;
};

function r_vertex_attrib(shader_program, attrib_name, count, vertex_size, offset) {
	let location = gl.getAttribLocation(shader_program, attrib_name);
	gl.enableVertexAttribArray(location);
	gl.vertexAttribPointer(location, count, gl.FLOAT, false, vertex_size * 4, offset * 4);
};


function r_resize() {
	let w = window.innerWidth,
		h = window.innerHeight;
	c.width = r_width = Math.min(w, h*SCREEN_ASPECT);
	c.height = r_height = r_width/SCREEN_ASPECT;
	gl.viewport(0, 0, r_width, r_height);
}

function r_bind_image(image) {
	let texture_2d = gl.TEXTURE_2D;
	gl.bindTexture(texture_2d, gl.createTexture());
	gl.texImage2D(texture_2d, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(texture_2d, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(texture_2d, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(texture_2d, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(texture_2d, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function r_push_static_buffer() {
	let glbuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, r_buffer.subarray(0, r_num_verts*8), gl.STATIC_DRAW);
	r_glbuffer_static.push({b: glbuffer, v: r_num_verts});
	r_num_verts = 0;
}

function r_prepare_frame() {
	r_num_verts = 0;
	r_num_deferred_verts = 0;
	r_num_lights = 0;
	r_light_buffer.fill(1);
}

function r_clear() {
	gl.clearColor(0,0,0,1);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
}

function r_set_shader(shader) {
	gl.useProgram(shader.p);

	gl.uniform4f(shader.c, camera_x, camera_y, camera_z, SCREEN_ASPECT);
	gl.uniform1fv(shader.l, r_light_buffer);
}

function r_draw_buffer(gl_buffer, num_verts, data) {
	gl.bindBuffer(gl.ARRAY_BUFFER, gl_buffer);
	r_vertex_attrib(r_shader_render_terrain.p, 'p', 3, 8, 0);  // position
	r_vertex_attrib(r_shader_render_terrain.p, 'uv', 2, 8, 3); // texture coord
	r_vertex_attrib(r_shader_render_terrain.p, 'n', 3, 8, 5);  // normals

	if (data) {
		gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, num_verts*8), gl.DYNAMIC_DRAW);
	}
	gl.drawArrays(gl.TRIANGLES, 0, num_verts);
}

function r_end_frame() {
	// First pass to read mouse world coords, draw only the static terrain
	r_clear();
	r_set_shader(r_shader_coords);
	r_draw_buffer(r_glbuffer_static[0].b, r_glbuffer_static[0].v);

	let px = new Uint8Array(4);
	gl.readPixels(
		mouse_x/LOGICAL_SCREEN_WIDTH*r_width, 
		r_height-mouse_y/LOGICAL_SCREEN_HEIGHT*r_height, 
		1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px
	);
	mouse_world_x = ((px[0] / 255)-0.5) * 512-camera_x;
	mouse_world_y = (px[1] / 255) * MAP_HEIGHT;
	mouse_world_z = ((px[2] / 255)-1.2) * 512-camera_z;

	// Second pass, the real render
	r_clear();

	// Static terrain
	r_set_shader(r_shader_render_terrain);
	r_draw_buffer(r_glbuffer_static[0].b, r_glbuffer_static[0].v);
	
	// Static terrain cosmetics
	r_set_shader(r_shader_render_objects);
	r_draw_buffer(r_glbuffer_static[1].b, r_glbuffer_static[1].v);

	// Dynamic objects
	r_draw_buffer(r_glbuffer_dynamic, r_num_verts, r_buffer);

	// Deferred objects (shadows, transparents)
	gl.depthMask(false);
	r_draw_buffer(r_glbuffer_dynamic, r_num_deferred_verts, r_buffer_deferred);
	gl.depthMask(true);
}

function r_get_quad(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, tile) {
	let u = tile * R_TILE_FRACTION + R_PX_NUDGE,
		n = face_normal(x1, y1, z1, x2, y2, z2, x3, y3, z3);
	return [
		x1, y1, z1, u, 0, n[0], n[1], n[2],
		x2, y2, z2, u + R_TILE_FRACTION - R_PX_NUDGE, 0, n[0], n[1], n[2],
		x3, y3, z3, u, 1, n[0], n[1], n[2],
		x2, y2, z2, u + R_TILE_FRACTION - R_PX_NUDGE, 0, n[0], n[1], n[2],
		x3, y3, z3, u, 1, n[0], n[1], n[2],
		x4, y4, z4, u + R_TILE_FRACTION - R_PX_NUDGE, 1, n[0], n[1], n[2]
	];
}

function r_push_quad(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, tile) {
	r_buffer.set(r_get_quad(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, tile), r_num_verts * 8);
	r_num_verts += 6;
}

function r_push_quad_deferred(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, tile) {
	r_buffer_deferred.set(r_get_quad(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, tile), r_num_deferred_verts * 8);
	r_num_deferred_verts += 6;
}

function r_push_light(x, y, z, r, g, b, falloff) {
	if (r_num_lights < R_MAX_LIGHTS) {
		r_light_buffer.set([x, y, z, r, g, b, falloff], r_num_lights*7);
		r_num_lights++;
	}
}

