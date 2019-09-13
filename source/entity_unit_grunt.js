
let ENTITY_UNIT_ANIM_SHOOT = [0.2, [0,5,5,5,5,5,5,5]];

class entity_unit_grunt_t extends entity_unit_t {
	_init(name) {
		super._init(name);
		this._model = model_init(model_data[9], 0.4, 5);
		this._speed = 31;
		this._shoot_wait = 0;
		this._shoot_flash = 0;
		this._can_target = 1;
		this._is_shooting = 0;
	}

	_update() {
		// Find target, shoot in bursts
		this._shoot_wait -= game_tick;
		this._shoot_flash -= game_tick;
		if (!this._path[0] && this._shoot_wait < 0) {
			let nearest_enemy = game_get_nearest_entity(entities_enemies, this.x, this.z, 64);
			if (nearest_enemy) {
				this._shoot_target = nearest_enemy;
				this._shoot_wait = 1;
				if (this._anim != ENTITY_UNIT_ANIM_SHOOT) {
					this._anim = ENTITY_UNIT_ANIM_SHOOT;
					this._anim_time = 0;
				}
				else {
					this._anim_time = 0.1;
				}
				this._rotate_to(this._shoot_target);
			}
			else {
				this._anim = ENTITY_ANIM_IDLE;
			}
		}
		
		if (this._shoot_wait > 0.7) {
			if (this._shoot_flash < 0) {
				this._shoot_target._receive_damage(this, 0.04);
				this._shoot_flash = 0.1;
				audio_play(sfx_shoot)
			}
			r_push_light(this.x, this.y+15, this.z+7, 1, 0.4, 0, 0.005 / this._shoot_flash);
		}

		super._update();
	}
}