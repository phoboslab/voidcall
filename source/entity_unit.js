
class entity_unit_t extends entity_t {
	_init(name) {
		this._model_waypoint = model_init(model_data[2], 0.5, 7);
		this._name = name;
		this._build_opts = [];
		this._group = entities_units;
		this._can_move = 1;
		this._can_target = 0;
		this._set_collision(1);
		super._init();
	}

	_chat(message) {
		let div = document.createElement('div');
		div.textContent = '<'+this._name+'>: ' + message;
		a.appendChild(div);
		setTimeout(function(){ a.removeChild(div); }, 8000);
		audio_play(sfx_terminal);
	}

	_chat_report() {
		this._chat(
			this._can_move 
				? 'reporting in'
				: 'operational / uptime: '+
					(this._anim_time|0)+
					's / mfree: '+random_int(1400,1900)+
					'bytes'
		);
	}

	_chat_ok() {
		this._chat('on my way');
	}

	_set_target(x, z) {
		super._set_target(x, z);
		this._build_target = null;
	}

	_target_reached() {
		this._anim = ENTITY_ANIM_IDLE;
	}

	_update() {
		if (this._follow_path()) {
			this._anim = [0.20, [1,2,3,4]];
		}
		this.y = map_get_height(this.x+4, this.z+4);
		this._draw_model(4, 5, 4);

		// Waypoints
		for (var i = 0; i < this._path.length; i++) {
			let p = this._path[i],
				y = map_get_height(p.x, p.z);

			// Draws the waypoint with some sin() bobbing, offset by x/z pos
			this._model_waypoint(
				p.x + 4, 
				y + 1 + Math.sin(this._anim_time * 2 + p.x + p.z) * 2, 
				p.z + 4, 
				this._anim_time * 2
			);
		}

		r_push_light(this.x, this.y+64, this.z+7, 0.3, 0.3, 0.7, 0.02);
		r_push_quad_deferred(
			this.x - 0.5, this.y + 0.1, this.z + 1, 
			this.x +  16, this.y + 1.5, this.z + 5, 
			this.x - 0.5, this.y + 0.1, this.z + 10, 
			this.x +  16, this.y + 1.5, this.z + 14,
			12
		);
	}

	_kill() {
		super._kill();
		if (this._can_move) {
			this._chat('aaaaaaaaaarrrgh');
			game_num_guys--;
		}
		else {
			this._chat('MALFUNCTION');
		}
		this._spawn_particles(4, this._tile);
		this._spawn_particles(4, 13);
	}

	_receive_damage(from, amount) {
		if (this._dead) { return; }
		audio_play(sfx_hurt);
		super._receive_damage(from, amount);
	}
}
