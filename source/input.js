let keys = {37: 0, 38: 0, 39: 0, 40: 0, 32: 0},
	key_cycle_units = 32, // space
	key_up = 38,
	key_down = 40,
	key_left = 37,
	key_right = 39,
	key_action = 512,
	key_cancel = 513,
	// convert AWDS to arrow key, space to tab
	key_convert = {65: 37, 87: 38, 68: 39, 83: 40, 9: 32}, 
	keys_allow_control = 0,
	mouse_x = 0, mouse_y = 0;

document.onkeydown = function(ev){
	let k = key_convert[ev.keyCode] || ev.keyCode;
	if (keys[k] != undefined) {
		ev.preventDefault();
		keys[k] = 1 && keys_allow_control;
	}
};

document.onkeyup = function(ev) {
	let k = key_convert[ev.keyCode] || ev.keyCode;
	if (keys[k] != undefined) {
		ev.preventDefault();
		keys[k] = 0;
	}
};

document.onmousemove = function(ev) {
	let r = c.getBoundingClientRect();
	mouse_x = ((ev.clientX-r.x) / r.width) * LOGICAL_SCREEN_WIDTH;
	mouse_y = ((ev.clientY-r.y) / r.height) * LOGICAL_SCREEN_HEIGHT;
};

document.onmousedown = function(ev) {
	ev.preventDefault();
	if (ev.which == 1 && keys_allow_control) {
		keys[key_action] = 1 && keys_allow_control;
	}
};

document.onmouseup = function(ev) {
	ev.preventDefault();
	if (ev.which == 1) {
		keys[key_action] = 0;
	}
};

document.oncontextmenu = function(ev) {
	ev.preventDefault();
	keys[key_cancel] = 1 && keys_allow_control;
};