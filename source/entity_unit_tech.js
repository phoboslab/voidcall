
class entity_unit_tech_t extends entity_unit_t {
	_init(name) {
		super._init(name);
		this._model = model_init(model_data[9], 0.4, 4);

		// [entity class, target entity group or null, models...]
		this._build_opts = [
			[
				entity_unit_harvester_t,
				entities_wells,
				model_init(model_data[8], 0.3, 8)
			],
			[
				entity_unit_turret_t,
				0,
				model_init(model_data[1], 0.3, 8),
				model_init(model_data[0], 0.3, 8)
			]			
		];
	}

	_target_reached() {
		super._target_reached();
		if (this._build_target) {
			game_spawn(this._build_target, this.x, this.z, this._target_well);

			// Workaround so we don't delete the build's collision again
			this._has_map_collision = 0; 

			this._set_target(this.x-8, this.z);
			this._chat('all done');

			this._build_target = 0;
		}
	}

	_build(x, z, entity_type) {
		// Check if we're on a well, if we want to build a harvester
		this._target_well = game_get_entities(entities_wells, x+8, z+8, x+8, z+8)[0];
		if (
			entity_type == entity_unit_harvester_t && 
			(!this._target_well || this._target_well._dormant)
		) {
			this._chat('I can only build this on a well');
		}
		// Check if we have enough energy for a turret
		else if (
			entity_type == entity_unit_turret_t &&
			(game_energy_current - game_energy_usage) < 10
		) {
			this._chat('not enough energy');
		}
		// Set build target!
		else {
			this._set_target(x, z);
			if (this._path[0]) {
				this._chat('building!');
				this._build_target = entity_type;
			}
		}
	}
}