
class entity_well_t extends entity_t {
	_init() {
		this._group = entities_wells;
		super._init();
		this._model = model_init(model_data[7], 0.3, 8);
		this._can_move = 0;
	}
	_update() {
		r_push_light(this.x, this.y+15, this.z+4, 0.1, 0.1, 0.9, 0.02);

		if (this._dormant) {
			return;
		}
		this._anim_time += game_tick;
		if (this._anim_time > 1) {
			this._anim_time = 0;
			this._spawn_particles(2, 8, -4, -4);
		}
		
		this._draw_model(0, 0.8, 0);
	}
}
