
class entity_unit_harvester_t extends entity_unit_t {
	_init(well) {
		super._init();
		this._model = model_init(model_data[8], 0.3, 9);
		this._can_move = 0;
		this._well = well;
		this._well._dormant = 1;
		this._name = 'harvester#'+random_int(0,0xffff).toString(16);
		game_energy_current += 18;
		game_update_energy();
	}

	_update() {
		this._draw_model(4, 5, 4);
	}

	_kill() {
		super._kill();
		audio_play(sfx_explode);
		this._spawn_particles(16, 9);
		this._well._dormant = 0;
		game_energy_current -= 18;
		game_update_energy();
	}
}
