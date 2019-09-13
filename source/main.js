let model_data,
	music,
	sfx_shoot,
	sfx_hit,
	sfx_hurt,
	sfx_terminal,
	sfx_explode,

	title_cancel = 0;

(async function load() {
	model_data = await model_load_container('m/m.rmfc');

	r_init();
	map_generate(-1233871127); // Chosen by fair dice roll

	let texture = new Image();
	texture.src = 'm/t.png';
	texture.onload = function(){
		r_bind_image(texture); 
		requestAnimationFrame(title_screen);

		document.onclick = document.ontouchend = function() {
			document.onclick = null;
			document.ontouchend = null;

			// Current Safari doesn't support requestFullscreen, so test first.
			document.body.requestFullscreen && document.body.requestFullscreen();

			audio_init();
			sfx_shoot = audio_create_sound(sound_shoot, 140);
			sfx_hit = audio_create_sound(sound_hit, 134);
			sfx_hurt = audio_create_sound(sound_hurt, 144);
			sfx_terminal = audio_create_sound(sound_terminal, 156);
			sfx_explode = audio_create_sound(sound_explode, 114);
			audio_play(audio_create_song(music_i_wish_we_are_alone_in_the_universe), true);

			title_cancel = 1;
			t.style.display='none';
			game_init();
			requestAnimationFrame(game_run);
		};
	}
})();

function title_screen(time_now) {
	// Animate the sun for a fancy light show
	
	let f = Math.min(time_now*0.0003, 1);
	f = f*(2-f); // Ease out

	r_prepare_frame();
	r_push_light(
		Math.sin(time_now*0.0004)*2048,
		2048, 
		-7000+5800*f +Math.sin(time_now*0.00053)*512, 
		0.03*f, 0.03*f, 0.06*f, 0.000008);
	r_end_frame();
	
	if (!title_cancel) {
		requestAnimationFrame(title_screen);
	}
}