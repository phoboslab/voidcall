
let ENTITY_ANIM_IDLE = [1, [0]];

class entity_t {
	constructor(x, z, init_param) {
		this.x = x;
		this.z = z;
		this.vx = this.vy = this.vz = this.ax = this.ay = this.az = 0;
		this.f = 0;
		this._health = 1;
		this._dead = 0;

		this._path = [];
		this._rotation = 0;
		this._anim = ENTITY_ANIM_IDLE;
		this._anim_time = random_float();
		this._speed = 27;

		this.y = map_get_height(this.x, this.z);
		this._init(init_param);
	}

	_set_collision(set) {
		if (set || this._has_map_collision) {
			map_set_collision(this.x, this.z, set);
			this._has_map_collision = set;
		}
	}
	
	_init(init_param) {
		if (this._group) {
			this._group.push(this);
		}
	}

	_update() {}

	_rotate_to(other) {
		let dx = this.x - other.x,
			dz = other.z - this.z;

		this._rotation = Math.atan2(dx, dz);
	}

	_update_physics() {
		var t = this,
			last_x = this.x, last_z = this.z;

		// velocity
		this.vx += this.ax * game_tick - this.vx * Math.min(this.f * game_tick, 1);
		this.vy += this.ay * game_tick - this.vy * Math.min(this.f * game_tick, 1);
		this.vz += this.az * game_tick - this.vz * Math.min(this.f * game_tick, 1);
		
		// position
		this.x += this.vx * game_tick;
		this.y += this.vy * game_tick;
		this.z += this.vz * game_tick;
	}

	_set_target(x, z) {
		let px = x, pz = z, r = 0;

		// If the target is not free, spiral out to find a free spot
		while (map_get_collision(px, pz)) {
			px = x+Math.cos(r) * r;
			pz = z-Math.sin(r) * r;
			r++;
		}

		this._path = astar_get_path(this.x, this.z, px, pz);

		// Unset collision, if any
		if (this._path.length) {
			this._set_collision(0);
		}		
	}

	_follow_path() {
		let p = this._path[0];

		// Last leg of our path is occupied? Find a new target
		if (
			this._path.length == 1 && 
			map_get_collision(p.x, p.z) &&
			!this._ignore_occupied_path
		) {
			this._set_target(p.x, p.z, this._target_entity);
			p = this._path[0]
		}

		// Go to next path point
		if (!p) {
			this.vx = this.vz = 0;
			return 0;
		}

		let dx = this.x - p.x,
			dz = p.z - this.z;

		this._rotation = Math.atan2(dx, dz);
		this.vx = -this._speed * Math.sin(this._rotation);
		this.vz = this._speed * 1.25 * Math.cos(this._rotation);

		this._update_physics();

		if (Math.abs(dx) + Math.abs(dz) < 1) {
			this._path.shift();

			// We have reached our target, set collision.
			if (!this._path.length) {
				this._ignore_occupied_path = 0;
				this._set_collision(1);
				this._target_reached();
				return 0;
			}
		}
		return 1;
	}

	_target_reached() {}

	_draw_model(ox, oy, oz, skip_faces) {
		this._anim_time += game_tick + random_float()*0.01;

		// Calculate which frames to use and how to mix them
		let f = (this._anim_time / this._anim[0]),
			mix = f - (f|0),
			frame_cur = this._anim[1][(f|0) % this._anim[1].length],
			frame_next = this._anim[1][((f+1)|0) % this._anim[1].length];
		
		this._model(
			this.x+ox, this.y+oy, this.z+oz, this._rotation, 
			frame_cur, frame_next, mix, skip_faces
		);
	}

	_spawn_particles(amount, tile, offset_x, offset_z) {
		for (var i = 0; i < amount; i++) {
			var particle = game_spawn(
				entity_particle_t, 
				this.x+(offset_x||0), this.z+(offset_z||0), tile
			);
			particle.vx = (random_float() - 0.5) * 228;
			particle.vy = random_float() * 300;
			particle.vz = (random_float() - 0.5) * 228;
		}
	}

	_receive_damage(from, amount) {
		this._health -= amount;
		if (this._health <= 0) {
			this._kill();
		}
	}

	_kill() {
		if (!this._dead) {
			this._dead = 1;
			if (this._group) {
				this._group.splice(this._group.indexOf(this), 1);
			}
			entities_to_kill.push(this);

			// Unset collision, if any
			this._set_collision(0);
		}
	}
}
