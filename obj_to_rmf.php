<?php

/* Convert Wavefront OBJ to Retarded Model Format (RMF)

struct {
	uint8_t num_frames;
	uint8_t num_verts; // per frame
	uint16_t num_indices;
	struct {
		uint8_t reserved : 1;
		int8_t x : 5;
		int8_t y : 5;
		int8_t z : 5;
	} verts[num_frames * num_verts];
	struct {
		uint8_t a_address_inc : 2;
		uint8_t b_index : 7;
		uint8_t c_index : 7;
	} indices[num_indices];
} rmf_data;
*/

if (count($argv) < 3 || !file_exists($argv[1])) {
	die("Usage: php obj-to-rmf.php frame1.obj frame2.obj... outfile.rmf");
}


$infiles = array_slice($argv, 1, -1);
$verts = [];
$indices = [];
$max = -INF;

// Find vertices in all files
foreach ($infiles as $file) {
	if (!file_exists($file)) {
		die("Couldn't load $file");
	}
	echo "Loading $file\n";
	foreach (file($file) as $line) {
		if (preg_match('#^v (.*?) (.*?) (.*?)$#', $line, $m)) {
			$v = [(float)$m[1], (float)$m[2], (float)$m[3]];
			$verts[] = $v;
			$max = max($max, abs($v[0]), abs($v[1]), abs($v[2]));
		}
	}	
}

// Find indices in first file (we assume the layout is the same in all
// subsequent animation frames).
foreach (file($infiles[0]) as $line) {	
	if (preg_match('#^f (\d+).*?(\d+).*?(\d+).*?$#', $line, $m)) {
		$indices[] = [((int)$m[1])-1, ((int)$m[2])-1, ((int)$m[3])-1];
	}
}

// Pack header
$packed = 
	pack('C', count($infiles)).
	pack('C', count($verts)/count($infiles)).
	pack('v', count($indices));
	
// Pack normalized (-15, 15) vertices	
foreach ($verts as $i => $v) {
	$x = round(($v[0]/$max)*15)+15;
	$y = round(($v[1]/$max)*15)+15;
	$z = round(($v[2]/$max)*15)+15;

	// echo "Vertex $i => ($x, $y, $z)\n";
	$packed .= pack('v', ($x << 10) | ($y << 5) | $z);
}

// Pack indices w. vertex index
$a_last_index = 0;
foreach ($indices as $i => $f) {
	$a_address_inc =  $f[0] - $a_last_index;
	if ($a_address_inc > 3) {
		die("Face $i index a increment exceeds 2 bits ($a_address_inc)");
	}
	$a_last_index = $f[0];

	if ($f[1] > 127 || $f[2] > 127) {
		die("Face $i index exceeds 7 bits ({$f[1]}, {$f[1]}, {$f[2]})");
	}
	
	// echo "Face $i => ({$f[1]}, {$f[1]}, {$f[2]})\n";
	$packed .= pack('v', ($a_address_inc << 14) | ($f[1] << 7) | $f[2]);
}

// Write
$packedfile = $argv[$argc-1];
file_put_contents($packedfile, $packed);

echo "Wrote $packedfile: ".
	count($infiles)." frame(s), ".
	count($verts)." verts, ".
	count($indices)." indices, ".
	strlen($packed)." bytes\n";