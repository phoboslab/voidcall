php obj_to_rmf.php assets/turret_head.obj assets/turret_head.rmf
php obj_to_rmf.php assets/turret_base.obj assets/turret_base.rmf
php obj_to_rmf.php assets/waypoint.obj assets/waypoint.rmf
php obj_to_rmf.php assets/select.obj assets/select.rmf
php obj_to_rmf.php assets/tree.obj assets/tree.rmf
php obj_to_rmf.php assets/lander.obj assets/lander.rmf
php obj_to_rmf.php assets/grass.obj assets/grass.rmf
php obj_to_rmf.php assets/boulder.obj assets/boulder.rmf
php obj_to_rmf.php assets/harvester.obj assets/harvester.rmf
php obj_to_rmf.php \
	assets/unit_idle.obj \
	assets/unit_run_1.obj \
	assets/unit_run_2.obj \
	assets/unit_run_3.obj \
	assets/unit_run_4.obj \
	assets/unit_fire.obj \
	assets/unit.rmf
php obj_to_rmf.php \
	assets/enemy_idle.obj \
	assets/enemy_run_1.obj \
	assets/enemy_run_2.obj \
	assets/enemy.rmf

# Combine models with a simple header
php combine_rmf.php \
	assets/turret_head.rmf \
	assets/turret_base.rmf \
	assets/waypoint.rmf \
	assets/select.rmf \
	assets/tree.rmf \
	assets/lander.rmf \
	assets/grass.rmf \
	assets/boulder.rmf \
	assets/harvester.rmf \
	assets/unit.rmf \
	assets/enemy.rmf \
	m/m.rmfc


# Concat js Source
cat \
	source/defs.js \
	source/utils.js \
	source/astar.js \
	source/audio.js \
	source/model.js \
	source/perlin_noise.js \
	source/renderer.js \
	source/map.js \
	source/entity.js \
	source/entity_cursor.js \
	source/entity_unit.js \
	source/entity_unit_tech.js \
	source/entity_unit_grunt.js \
	source/entity_unit_med.js \
	source/entity_unit_turret.js \
	source/entity_unit_harvester.js \
	source/entity_particle.js \
	source/entity_enemy.js \
	source/entity_well.js \
	source/entity_lander.js \
	source/game.js \
	source/input.js \
	source/main.js \
	source/sound_effects.js \
	source/music_i_wish_we_are_alone_in_the_universe.js \
	> build/game.js

# Compress WebGL calls, SonantX music
node shrinkit.js build/game.js > build/game.compact.js

# Uglify JS
./node_modules/uglify-es/bin/uglifyjs build/game.compact.js \
	--compress --screw-ie8 --mangle toplevel -c --beautify --mangle-props regex='/^_/;' \
	-o build/game.min.beauty.js
	
./node_modules/uglify-es/bin/uglifyjs build/game.compact.js \
	--compress --screw-ie8 --mangle toplevel --mangle-props regex='/^_/;' \
	-o build/game.min.js

# Embed source into HTML
sed -e '/GAME_SOURCE/{r build/game.min.js' -e 'd}' source/html_template.html > index.html


# Build ZIP
rm build/game.zip

# rm build/game.zip
zip build/game.zip \
	index.html \
	m/m.rmfc \
	m/t.png 
advzip -z -4 build/game.zip
ls -la build/
