
class entity_unit_turret_t extends entity_unit_t {
	_init() {
		super._init();
		this._model_base = model_init(model_data[1], 0.3, 9);
		this._model_head = model_init(model_data[0], 0.3, 9);
		this._rotation = random_float()*Math.PI*2;
		this._head_rotation = this._rotation;
		this._base_rotation = this._rotation;
		this._rotation += Math.PI;
		this._can_move = 0;
		this._can_target = 1;
		this._name = 'turret#0x'+random_int(0x1111,0xffff).toString(16);
		this._shoot_wait = 0;
		this._shoot_flash = 0;

		game_energy_usage += 7;
		game_update_energy();
	}

	_update() {
		// Rotate to target
		this._head_rotation = this._head_rotation % (Math.PI*2);
		let rdiff = this._head_rotation - this._rotation,
			d = Math.abs(rdiff) % (Math.PI*2),
			rotate_dir = (rdiff >= 0 && rdiff <= Math.PI) || 
				(rdiff <=-Math.PI && rdiff>= -Math.PI*2) ? -4 : 4;

		if (d > 0.1) {
			this._head_rotation += rotate_dir * game_tick;
		}

		this._anim_time += game_tick;
		this._model_base(this.x+4, this.y+1, this.z+4, this._base_rotation);
		this._model_head(this.x+4, this.y+1, this.z+4, this._head_rotation-Math.PI);

		// Shooting
		this._shoot_wait -= game_tick;
		this._shoot_flash -= game_tick;
		if (this._shoot_wait < 0 && d < 0.5) {
			let nearest_enemy = game_get_nearest_entity(entities_enemies, this.x, this.z, 64);
			if (nearest_enemy) {
				this._shoot_wait = 0.15;
				this._rotate_to(nearest_enemy);

				nearest_enemy._receive_damage(this, 0.01);
				audio_play(sfx_shoot)
				r_push_light(this.x, this.y+15, this.z+7, 1, 0.4, 0, 0.02 / this._shoot_wait);
			}
		}
	}

	_kill() {
		super._kill();
		this._spawn_particles(16, 9);
		audio_play(sfx_explode);
		game_energy_usage -= 7;
		game_update_energy();
	}
}
