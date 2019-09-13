<?php

/* Combine several RMF model files into a single container. Offests are padded
to the next 16bit boundary.

struct {
	uint16_t num_models;
	uint16_t num_bytes[num_models];
	uint16_t data[];
} rmf_container_data;
*/

if (count($argv) < 3 || !file_exists($argv[1])) {
	die("Usage: php combine-rmf.php in1.rmf in2.rmf... outfile.rmf");
}

echo "Combining RMF Models\n";

// Load everything into memory, record offsets
$infiles = array_slice($argv, 1, -1);
$data = '';
$sizes = [];
foreach ($infiles as $i => $file) {
	$model = file_get_contents($file);

	// Pad to next 16bit boundary
	if (strlen($model) % 2 == 1) {
		$model .= pack('C', 0);
	}

	$sizes[] = strlen($model);
	$data .= $model;

	echo "[$i] = $file\n";
}

$header = pack('v', count($sizes));
foreach ($sizes as $o) {
	$header .= pack('v', $o);
}

$packed = $header . $data;

// Write
$packedfile = $argv[$argc-1];
file_put_contents($packedfile, $packed);

echo "Wrote $packedfile: ".
	count($sizes)." models(s), ".
	strlen($packed)." bytes\n";