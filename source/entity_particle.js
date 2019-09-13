
class entity_particle_t extends entity_t {
	_init(tile) {
		this._model = model_init(model_data[7], 0.05, tile);
		this.f = 4;
		this._rotation = random_float()*Math.PI*2;
	}

	_update() {
		this.ay = -320;

		let ground_y = map_get_height(this.x, this.z);
		if (this.y < ground_y) {
			this.y = ground_y;
			this.vy = -this.vy * 0.48;
		}
		if (this._anim_time > 3) {
			this._kill();
		}
		super._update_physics();
		this._draw_model(4, 1, 4);

		r_push_quad_deferred(
			this.x +4 + this.y-ground_y, ground_y + 0.1, this.z + 1, 
			this.x +9 + this.y-ground_y, ground_y + 1.5, this.z + 2, 
			this.x +4 + this.y-ground_y, ground_y + 0.1, this.z + 4, 
			this.x +9 + this.y-ground_y, ground_y + 1.5, this.z + 5,
			12
		);
	}
}
