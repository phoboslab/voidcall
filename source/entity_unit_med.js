
class entity_unit_med_t extends entity_unit_t {
	_init(name) {
		super._init(name);
		this._model = model_init(model_data[9], 0.4, 6);
		this._speed = 22;
	}

	_update() {
		super._update();
		if (!this._path[0]) {

			// This should get an entity in range that actually needs healing,
			// instead of the closest one. But I ran out of space :/
			let nearest_unit = game_get_nearest_entity(entities_units, this.x, this.z, 10, this);
			if (nearest_unit && nearest_unit._health < 1) {
				this._anim = [0.4, [0,5,5,0,0,5,5,5]];
				this._rotate_to(nearest_unit);
				nearest_unit._health += game_tick*0.1;
			}
			else {
				this._anim = ENTITY_ANIM_IDLE;
			}
		}
	}
}