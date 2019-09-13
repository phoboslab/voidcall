
class entity_lander_t extends entity_t {
	_init(name) {
		this._model = model_init(model_data[5], 4, 9);
		this._boarding = 0;
		this._ascending = 0;
	}

	_update() {
		let map_y = map_get_height(this.x, this.z)+14,
			s = Math.sin(game_time_last*0.0005)*3;
		
		if (this._ascending) {
			super._update_physics();
			if (this.y > 300) {
				this._kill();
				game_end('THE END', 'You rescued '+game_num_guys+' crew');
				camera_target_y = 900;
				camera_target_x = 950;
				camera_target_z = 3000;
			}
		}
		else if (this._boarding) {
			super._update_physics();
			if (this.y < map_y+4) {
				this.ay = 24;
				this.ax = -48;
				this.az = 48;
				this._ascending = 1;

				// Preventing drawin the guys, but don't kill() them
				for (let i = 0; i < this._units.length; i++) {
					this._units[i]._dead = 1; // How ironic
				}
			}
		}
		else if (game_energy_filled) {
			this._units = game_get_entities(entities_units, this.x-64, this.z-64, this.x+64, this.z+64)
				.filter(function(e){
					return e._can_move;
				});
			if (game_num_guys && this._units.length == game_num_guys) {
				this._boarding = 1;
				this.ay = -5;
				keys_allow_control = 0;
				camera_target_x = this.x;
				camera_target_y = 192;
				camera_target_z = this.z+230;
				for (let i = 0; i < this._units.length; i++) {
					this._units[i]._set_target(this.x-16, this.z-32);
				}
			}
		}
		else {
			this.y = map_y + 18 + s;
		}
		
		this._model(this.x, this.y, this.z, 4.1);
		
		r_push_light(
			this.x-10, map_y+37, this.z+4,
			1, 1, 1,
			0.05-game_energy_filled*0.03*Math.sin(game_time_last*0.01)
		);
		r_push_quad_deferred(
			this.x - 34, map_y + 0.1, this.z + 18, 
			this.x + 44, map_y + 1.5, this.z - 38, 
			this.x - 18+s, map_y + 0.1, this.z + 34+s, 
			this.x + 52+s, map_y + 1.5, this.z - 6+s,
			12
		);
	}
}
