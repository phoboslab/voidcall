
class entity_cursor_t extends entity_t {
	_init() {
		this._selected_entities = [];
		this._model_select = model_init(model_data[3], 0.3, 8);
		this._model_select_small = model_init(model_data[3], 0.12, 7);
		this._unit_cycle_index = 0;
	}

	_update() {
		this.x = mouse_world_x;
		this.z = mouse_world_z+1;
		this.y = map_get_height(this.x, this.z);


		// I LOVE SPAGHETTI!


		// Tab-Cycle through movable units
		if (this._wait_for_cycle_units_up && !keys[key_cycle_units]) {
			this._wait_for_cycle_units_up = 0;
			let units = entities_units.filter(function(e){
				return e._can_move;
			});
			if (units.length) {
				let unit = units[(this._unit_cycle_index++)%units.length]
				this._selected_entities = [unit];
				camera_target_x = unit.x;
				camera_target_z = unit.z+350;
			}
		}
		else if (keys[key_cycle_units]){
			this._wait_for_cycle_units_up = 1;
		}

		// Deselect
		if (keys[key_cancel]) {
			this._selected_entities = [];
			this._build_selected = null;
		}

		
		// Click on build option
		if (this._build_hover && keys[key_action]) {
			this._build_selected = this._build_hover;
		}

		// Start selection
		else if (!this._is_selecting && keys[key_action]) {
			this._is_selecting = 1;
			this._selection_start_x = this.x;
			this._selection_start_z = this.z;
			this._selection_mouse_x = mouse_x;
			this._selection_mouse_y = mouse_y;
		}

		// End selection
		if (this._is_selecting && !keys[key_action]) {
			this._is_selecting = 0;

			let in_selection = game_get_entities(
				entities_units, 
				this._selection_start_x, this._selection_start_z,
				this.x, this.z
			);

			let did_move = 
				Math.abs(this._selection_mouse_x - mouse_x) + 
				Math.abs(this._selection_mouse_y - mouse_y) > 4;

			// Selected at least one entity? Report!
			if (in_selection.length) {
				this._selected_entities = in_selection;
				random_element(this._selected_entities)._chat_report();
				this._build_selected = null;
			}
			else if (did_move) {
				this._selected_entities = [];
				this._build_selected = null;
			}

			// Nothing selected, but we still have a previous selection AND
			// the cursor didn't move (much) -> command!
			else if (this._selected_entities.length) {
				// Build
				if (this._build_selected) {
					this._selected_entities[0]._build(this.x-4, this.z, this._build_selected[0]);
					this._build_selected = null;
				}

				// Move
				else {
					let movable_entities = this._selected_entities.filter(function(e){
						return e._can_move;
					});
					let grid_size = (Math.pow(movable_entities.length, 0.5)-1)/2;
					for (let i = 0, gx = -grid_size, gz = -grid_size; i < movable_entities.length; i++, gx++) {
						movable_entities[i]._set_target(this.x-4+gx*8, this.z+gz*8);
						if (gx > grid_size) {
							gx = -grid_size;
							gz++;
						}
					}
					if (movable_entities.length) {
						random_element(movable_entities)._chat_ok();
					}
				}
			}
		}

		// Hover over entity
		else if (!this._is_selecting) {
			let e = game_get_entities(entities_units, this.x, this.z, this.x, this.z)[0];
			if (e && this._selected_entities.indexOf(e) == -1) {
				this._draw_selection(e.x+1, e.z+3, e.x+7, e.z+9, this._model_select_small);
			}
		}

		// Show build target
		if (this._build_selected && !map_get_collision(this.x-4, this.z)) {
			let x = (((this.x-4)/TILE_SIZE)|0)*TILE_SIZE,
				z = ((this.z/TILE_SIZE)|0)*TILE_SIZE;

			this._draw_selection(x+4, z+4, x+12, z+12, this._model_select_small, Math.PI);
			for (var i = 2; i < this._build_selected.length; i++) {
				this._build_selected[i](x+8, this.y+2, z+8, 0);
			}
		}

		// Draw selection and health
		for (let i = 0; i < this._selected_entities.length; i++) {
			let e = this._selected_entities[i];
			if (e._dead) {
				this._selected_entities.splice(i, 1);
				i--;
			}

			this._draw_selection(e.x+1, e.z+3, e.x+7, e.z+9, this._model_select_small);
			r_push_quad(
				e.x+1, e.y+15, e.z+4,
				e.x+1+6*e._health, e.y+15, e.z+4,
				e.x+1, e.y+14, e.z+4,
				e.x+1+6*e._health, e.y+14, e.z+4,
				8
			);
		}

		// Draw selection area
		if (this._is_selecting) {
			let x1 = Math.min(this._selection_start_x, this.x),
				z1 = Math.min(this._selection_start_z, this.z),
				x2 = Math.max(this._selection_start_x, this.x),
				z2 = Math.max(this._selection_start_z, this.z);
			if (x2-x1 + z2-z1 > 8) {
				this._draw_selection(x1, z1, x2, z2, this._model_select);
			}
		}

		// Build menu
		this._build_hover = null;
		if (this._selected_entities.length == 1) {
			let build_opts = this._selected_entities[0]._build_opts;
			for (let i = 0; i < build_opts.length; i++) {
				let opt = build_opts[i],
					rotation = 0;
				if (mouse_x > 64+i*112 && mouse_x < 138+i*112 && mouse_y > 625 && mouse_y < 688) {
					this._anim_time += game_tick;
					rotation = this._anim_time;
					this._build_hover = opt;
				}
				for (let j = 2; j < opt.length; j++) {
					opt[j](-camera_x-60+i*12, 132-i*4, -camera_z-124, rotation);
				}
			}
		}
	}

	_draw_selection(x1, z1, x2, z2, model, rotation) {
		rotation = rotation || 0;
		let y1 = map_get_height(x1, z1)+2,
			y2 = map_get_height(x1, z2)+2,
			y3 = map_get_height(x2, z1)+2,
			y4 = map_get_height(x2, z2)+2;

			model(x1, y1, z1, rotation+Math.PI, 0, 0);
			model(x1, y2, z2, rotation+Math.PI*0.5, 0, 0);
			model(x2, y3, z1, rotation+Math.PI*1.5, 0, 0);
			model(x2, y4, z2, rotation+0, 0, 0);
	}
}
