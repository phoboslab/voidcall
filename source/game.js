let
	game_tick=0,
	game_time_last,

	entity_cursor,

	current_level = 0,
	entities = [],
	entities_units = [],
	entities_enemies = [],
	entities_wells = [],
	entities_to_kill = [],
	game_num_guys = 6,

	camera_x =-668,
	camera_y =-255,
	camera_z =-1296,

	camera_target_x = 619,
	camera_target_y = 256,
	camera_target_z = 1680,

	game_story_index = 0,
	game_spawn_wait = 45,

	game_energy_current = 10,
	game_energy_usage = 0,
	game_energy_filled = 0,

	// [entity index, wait time, message]
	game_story = [
		[0, 2, 'kill it'],
		[0, 9, 'kill it!!1'],
		[0, 1, 'patch me up doc'],
		[5, 4, 'on my way'],
		[0, 2, 'they...'],
		[0, 3, 'they killed isaacs'],
		[2, 2, 'screw the mission'],
		[2, 3, 'we have to get BACK!'],
		[1, 2, 'I saw some energy wells'],
		[1, 8, 'we can build harvesters to get enough energy for a launch'],
		[0, 0, 'use wasd/arrow keys to scroll, tab to cycle your selection']
	],

	// x, z
	game_wells = [
		104, 225,
		222, 155,
		96, 78,
		30, 85,
		210, 46
	],

	// name: [type, x, z]
	game_unit_names = {
		bowman: [entity_unit_tech_t, 106, 162],
		floyd: [entity_unit_tech_t, 67, 172],
		cooper: [entity_unit_grunt_t, 77, 156],
		miller: [entity_unit_grunt_t, 74, 160],
		peck: [entity_unit_grunt_t, 79, 176],
		'dr.brown': [entity_unit_med_t, 64, 174]
	};

function game_init() {
	camera_x = -619;
	camera_y = -600;
	camera_z = -1980;

	// Spawn units, set inital story target for bowman and the enemy
	for(name in game_unit_names) {
		let unit = game_unit_names[name];
		game_spawn(unit[0], unit[1]*8, unit[2]*8, name);
	}
	entities[0]._set_target(67*8, 166*8);
	entities[0]._health = 0.5;

	let enemy = game_spawn(entity_enemy_t, 110*8,162*8);
	enemy._set_target(68*8, 166*8);
	enemy._health = 0.7;
	
	game_spawn(entity_lander_t, 515, 1370);

	for (let i = 0; i < game_wells.length; i+=2) {
		game_spawn(entity_well_t, game_wells[i]*8, game_wells[i+1]*8);
	}

	game_spawn(entity_cursor_t, 0, 0);
	setTimeout(game_story_next, 1000);
	setTimeout(game_spawn_enemy, game_spawn_wait*1000);
}

function game_spawn_enemy() {
	// Pick a random location on the map's edge
	let x, z, tx, tz, edge = random_int(0,1), r = 0;
	if (random_int(0,1)) {
		tx = x = random_int(16,MAP_SIZE-32) * 8;
		tz = z = edge*(MAP_SIZE-1)*8;
	}
	else {
		tx = x = edge*(MAP_SIZE+1) * 8;
		tz = z = random_int(16,MAP_SIZE-32) * 8;
	}

	// Spiral out to find a free spot for the first path target
	while (tx < 0 || tx > MAP_SIZE*8 || tz < 0 || tz > MAP_SIZE*8 || map_get_collision(tx, tz)) {
		tx = x+Math.cos(r) * r;
		tz = z-Math.sin(r) * r;
		r++;
	}

	let enemy = game_spawn(entity_enemy_t, x, z);

	// AStar will blow up when outside the map, so we don't want to find a new
	// path until we have reached our first target.
	enemy._ignore_occupied_path = 1; 
	enemy._path = [{x: tx, z: tz}];

	// This decreases the wait time by 5% each call. The next enemy spawn time
	// will also be shortened if we have a lot of energy - i.e. later in the 
	// game
	game_spawn_wait = Math.max(game_spawn_wait * 0.95, 20);
	setTimeout(game_spawn_enemy, game_spawn_wait*1000-game_energy_current * 150);
}

function game_story_next() {
	// Write story chat
	let story = game_story[game_story_index];
	entities[story[0]]._chat(story[2]);
	game_story_index++;

	// Schedule next story update
	if (game_story_index < game_story.length) {
		setTimeout(game_story_next, story[1]*1000);
	}

	// Movement actions for different story steps
	if (game_story_index == 2) {
		entities[2]._set_target(85*8, 159*8);
		entities[3]._set_target(83*8, 165*8);
		entities[4]._set_target(88*8, 167*8);
	}
	if (game_story_index == 4) {
		entities[5]._set_target(entities[0].x, entities[0].z);
	}
	if (game_story_index == 7) {
		entities[2]._set_target(84*8,160*8)
	}
	if (game_story_index == 9) {
		entities[1]._set_target(68*8, 169*8);
		keys_allow_control = 1;
		p.style.display = 'block';
		game_update_energy();
	}
}

function game_update_energy() {
	pc.style.width = game_energy_current+'%';
	pu.style.width = game_energy_usage+'%';
	if (game_energy_current >= 99 && !game_energy_filled) {
		game_energy_filled = 1;
		// Zeroth unit should always be a movable one
		entities_units[0]._chat('we\'re ready. get EVERYONE back to the ship!');
	}
}

function game_spawn(type, x, z, param) {
	let entity = new (type)(x, z, param)
	entities.push(entity);
	return entity;
}

function game_get_entities(group, x1, z1, x2, z2, filter_self) {
	let vx1 = Math.min(x1, x2)-8,
		vx2 = Math.max(x1, x2),
		vz1 = Math.min(z1, z2)-8,
		vz2 = Math.max(z1, z2);
	return group.filter(function(e) {
		return !(
			e == filter_self || 
			e.x > vx2 ||
			e.x < vx1 ||
			e.z > vz2 ||
			e.z < vz1
		);
	});
}

function game_get_nearest_entity(group, x, z, dist, filter_self) {
	return game_get_entities(group, x-dist, z-dist, x+dist, z+dist, filter_self)
		.sort(function(a, b){ 
			return distance_squared(a.x, a.z, x, z) - 
				distance_squared(b.x, b.z, x, z);
		})[0];
}

function game_end(msg, sub) {
	t.innerHTML = '<h1>'+msg+'</h1>'+sub;
	t.style.display='block';
	t.style.color='#fff';
}

function game_run(time_now) {
	if (game_num_guys == 0) {
		game_end('YOU LOST', 'no one made it back');
	}

	game_tick = Math.min((time_now - (game_time_last||time_now)),66)/1000;
	game_time_last = time_now;

	
	// Edge scrolling only in fullscreen
	let screen_edge = document.fullscreen && keys_allow_control ? 32 : 0,
		camera_speed = 8;

	// Camera input - edge scrolling, cursor keys or WASD
	camera_target_x += (keys[key_left] || (mouse_x < screen_edge && mouse_x >= 0))
		? -camera_speed 
		: (keys[key_right] || (mouse_x > LOGICAL_SCREEN_WIDTH-screen_edge && screen_edge))
			? camera_speed 
			: 0;
	camera_target_z += (keys[key_up] || (mouse_y < screen_edge && mouse_y >= 0))
		? -camera_speed 
		: (keys[key_down] || (mouse_y > LOGICAL_SCREEN_HEIGHT - screen_edge && screen_edge))
			? camera_speed 
			: 0;

	camera_target_x = Math.min(1824, Math.max(224, camera_target_x));
	camera_target_z = Math.min(2192, Math.max(556, camera_target_z));

	// Apply some damping
	camera_x = camera_x * 0.92 - camera_target_x * 0.08;
	camera_y = camera_y * 0.92 - camera_target_y * 0.08;
	camera_z = camera_z * 0.92 - camera_target_z * 0.08;


	
	r_prepare_frame();

	// Sun light
	r_push_light(-1024, 1024, -1024, 0.03, 0.03, 0.03, 0.000008);

	// Update and render entities
	for (let i = 0, e1; i < entities.length; i++) {
		if (!entities[i]._dead) {
			entities[i]._update();
		}
	}

	r_end_frame();


	// Remove dead entities
	entities = entities.filter(function(entity) {
		return entities_to_kill.indexOf(entity) === -1;
	});
	entities_to_kill = [];

	keys[key_cancel] = 0;
	requestAnimationFrame(game_run);
}
