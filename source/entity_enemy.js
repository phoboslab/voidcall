
class entity_enemy_t extends entity_t {
	_init(name) {
		this._model = model_init(model_data[10], .7, 10);
		this._speed = 28;
		this._hurt = 0;
		this._group = entities_enemies;
		this._has_strong_target = 0;
		this._update_target_wait = 0;
		this._can_hurt_wait = 0;
		super._init();
	}

	_update() {
		this._update_target_wait -= game_tick;
		this._can_hurt_wait -= game_tick;
		
		if (!this._ignore_occupied_path && this._update_target_wait < 0) {
			this._update_target_wait = 1.5;
			if (!this._target_entity || this._target_entity._dead) {
				// Find the nearest target ANYWHERE on the map
				this._target_entity = game_get_nearest_entity(entities_units, this.x, this.z, MAP_SIZE*8);
				this._has_strong_target = 0;
			}

			if (this._target_entity) {
				this._set_target(this._target_entity.x, this._target_entity.z);
			}
		}

		if (!this._ignore_occupied_path && this._can_hurt_wait < 0 && this._target_entity) {
			if (distance_squared(this.x, this.z, this._target_entity.x, this._target_entity.z) < 64) {
				this._set_target(this._target_entity.x, this._target_entity.z);
				this._can_hurt_wait = 2;
				this._target_entity._receive_damage(this, 0.35);
			}
		}

		if (this._follow_path()) {
			this._anim = [0.15, [1,0,2,0]];
		}
		else {
			this._anim = ENTITY_ANIM_IDLE;
		}

		this.y = map_get_height(this.x+4, this.z+4);
		this._draw_model(4, 0.5, 4, this._hurt ? 10 : 0);
		r_push_quad_deferred(
			this.x - 2, this.y + 0.5, this.z - 4, 
			this.x +  32, this.y + 3.5, this.z + 1, 
			this.x - 2, this.y + 0.5, this.z + 14, 
			this.x + 32, this.y + 3.5, this.z + 18,
			12
		);
	}

	_kill() {
		this._spawn_particles(25, 10);
		super._kill();
	}

	_receive_damage(from, amount) {
		if (this._dead) {
			return; 
		}
		if (!this._has_strong_target || !this._target_entity) {
			this._target_entity = from;
			this._has_strong_target = 1;
		}

		this._health -= amount;
		this._spawn_particles(1, 10);
		if (this._health < 0.3 && !this._hurt) {
			this._hurt = 1;
			this._speed = 20;
			this._spawn_particles(10, 10);
			audio_play(sfx_hit);
		}
		if (this._health < 0) {
			audio_play(sfx_hit);
			this._kill();
		}
	}
}
