// Gutted for js13k and modified to use Float32 buffers directly 
// ~ Dominic Szablewski, phoboslab.org, Sep 2018

// Almost re-written for for jsk13 2019. Oscilators now use a lookup table
// instead of calling functions. This and various other changes result in a
// ~10x performance increase and smaller file size.
// ~ Dominic Szablewski, phoboslab.org, Sep 2019

//
// Sonant-X
//
// Copyr (c) 2014 Nicolas Vanhoren
//
// Sonant-X is a fork of js-sonant by Marcus Geelnard and Jake Taylor. It is
// still published using the same license (zlib license, see below).
//
// Copyr (c) 2011 Marcus Geelnard
// Copyr (c) 2008-2009 Jake Taylor
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//	claim that you wrote the original software. If you use this software
//	in a product, an acknowledgment in the product documentation would be
//	appreciated but is not required.
//
// 2. Altered source versions must be plainly marked as such, and must not be
//	misrepresented as being the original software.
//
// 3. This notice may not be removed or altered from any source
//	distribution.


let AUDIO_SAMPLERATE = 44100, // Samples per second
	audio_num_sounds = 0,
	audio_ctx,
	AUDIO_TAB_SIZE = 4096,
	AUDIO_TAB_MASK = AUDIO_TAB_SIZE-1,
	AUDIO_OSC_TAB = new Float32Array(AUDIO_TAB_SIZE*4); // 4 oscilators

for (let i = 0; i < AUDIO_TAB_SIZE; i++) {
	AUDIO_OSC_TAB[i] = Math.sin(i*6.283184/AUDIO_TAB_SIZE); // sin
	AUDIO_OSC_TAB[i+AUDIO_TAB_SIZE] = AUDIO_OSC_TAB[i] < 0 ? -1 : 1; // square
	AUDIO_OSC_TAB[i+AUDIO_TAB_SIZE*2] = i / AUDIO_TAB_SIZE - 0.5; // saw
	AUDIO_OSC_TAB[i+AUDIO_TAB_SIZE*3] = i < AUDIO_TAB_SIZE/2 
		? (i/(AUDIO_TAB_SIZE/4)) - 1 
		: 3 - (i/(AUDIO_TAB_SIZE/4)); // tri
}

function audio_apply_delay(buf_l, buf_r, num_samples, instr, rowLen) {
	let p1 = (instr.fx_delay_time * rowLen) >> 1,
		t1 = instr.fx_delay_amt / 255,
		n1 = 0;

	while(n1 < num_samples - p1) {
		let b1 = n1;
		let l = (n1 + p1);
		buf_l[l] += buf_r[b1] * t1;
		buf_r[l] += buf_l[b1] * t1;
		n1++;
	}
}

function audio_get_freq(note) {
	return 0.00390625 * Math.pow(1.059463094, note - 128);
}

function audio_generate_sound(instr, rowLen, note, buf_l, buf_r, write_pos) {
	let osc_lfo_offset = instr.lfo_waveform * AUDIO_TAB_SIZE,
		osc1_offset = instr.osc1_waveform * AUDIO_TAB_SIZE,
		osc2_offset = instr.osc2_waveform * AUDIO_TAB_SIZE,
		attack = instr.env_attack,
		sustain = instr.env_sustain,
		release = instr.env_release,
		panFreq = Math.pow(2, instr.fx_pan_freq - 8) / rowLen,
		lfoFreq = Math.pow(2, instr.lfo_freq - 8) / rowLen,
	
		c1 = 0,
		c2 = 0,

	// Precalculate frequencues
		osc1_freq = 
			audio_get_freq(note + (instr.osc1_oct - 8) * 12 + instr.osc1_det) * 
			(1 + 0.0008 * instr.osc1_detune),
		osc2_freq = 
			audio_get_freq(note + (instr.osc2_oct - 8) * 12 + instr.osc2_det) * 
			(1 + 0.0008 * instr.osc2_detune);

	// Remove the next line and this function takes 10x as long in Chrome. 
	// Probably deopt, but I have no idea why.
	audio_num_sounds++; 

	let q = instr.fx_resonance / 255,
		low = 0,
		band = 0,

		buf_length = buf_l.length,
		num_samples = attack + sustain + release - 1;
	
	for (let j = num_samples; j >= 0; --j) {
		let k = j + write_pos;

		// LFO
		let lfor = 
			AUDIO_OSC_TAB[
				((k * lfoFreq*AUDIO_TAB_SIZE)&AUDIO_TAB_MASK) + osc_lfo_offset
			] * instr.lfo_amt / 512 + 0.5;

		// Envelope
		let e = 1;
		if (j < attack) {
			e = j / attack;
		}
		else if (j >= attack + sustain) {
			e -= (j - attack - sustain) / release;
		}

		// Oscillator 1
		let t = osc1_freq;
		if (instr.lfo_osc1_freq) {
			t += lfor;
		}
		if (instr.osc1_xenv) {
			t *= e * e 
		}
		c1 += t;
		let r_sample = AUDIO_OSC_TAB[
				((c1*AUDIO_TAB_SIZE)&AUDIO_TAB_MASK)+osc1_offset
			] * instr.osc1_vol;

		// Oscillator 2
		t = osc2_freq;
		if (instr.osc2_xenv) {
			t *= e * e;
		};
		c2 += t;
		r_sample += AUDIO_OSC_TAB[
				((c2*AUDIO_TAB_SIZE)&AUDIO_TAB_MASK)+osc2_offset
			] * instr.osc2_vol;

		// Noise oscillator
		if (instr.noise_fader) {
			r_sample += (2*Math.random()-1) * instr.noise_fader * e;
		}

		r_sample *= e / 255;

		// State variable filter
		let f = instr.fx_freq;
		if (instr.lfo_fx_freq) {
			f *= lfor;
		}

		// f = 1.5 * Math.sin(f * 3.141592 / AUDIO_SAMPLERATE);
		f = 1.5 * AUDIO_OSC_TAB[
				(f*0.5/AUDIO_SAMPLERATE*AUDIO_TAB_SIZE)&AUDIO_TAB_MASK
			]; // 3.141592/44100*AUDIO_TAB_SIZE/6.2

		low += f * band;
		let high = q * (r_sample - band) - low;
		band += f * high;
		
		switch (instr.fx_filter) {
			case 1: r_sample = high; break;  // Hipass
			case 2: r_sample = low; break; // Lopass
			case 3: r_sample = band; break; // Bandpass
			case 4: r_sample = low + high; break; // Notch
		}

		// Panning & master volume
		// t = osc_sin(k * panFreq) * instr.fx_pan_amt / 512 + 0.5;
		t = AUDIO_OSC_TAB[
				(k * panFreq*AUDIO_TAB_SIZE)&AUDIO_TAB_MASK
			] * instr.fx_pan_amt / 512 + 0.5;
		r_sample *= 0.00476 * instr.env_master; // 39 / 8192 = 0.00476

		// Add to 16-bit channel buffer
		if (k < buf_length) {
			buf_l[k] += r_sample * (1-t);
			buf_r[k] += r_sample * t;
		}
	}
}

function audio_create_song(song) {
	let num_samples = AUDIO_SAMPLERATE * song.songLen,
		mix_buf_l = new Float32Array(num_samples),
		mix_buf_r = new Float32Array(num_samples);

	for (var i = 0; i < song.songData.length; i++) {
		let instr = song.songData[i],
			buf_l = new Float32Array(num_samples),
			buf_r = new Float32Array(num_samples),
			write_pos = 0,
			p = 0,
			row = 0;

		while (true) {
			if (row == 32) {
				row = 0;
				p += 1;
				continue;
			}
			if (p == song.endPattern - 1) {
				audio_apply_delay(
					buf_l, buf_r, num_samples, instr, song.rowLen
				);
				for (let b = 0; b < num_samples; b++) {
					mix_buf_l[b] += buf_l[b];
					mix_buf_r[b] += buf_r[b];
				}
				break;
			}
			let cp = instr.p[p];
			if (cp) {
				let n = instr.c[cp - 1].n[row];
				if (n) {
					audio_generate_sound(
						instr, song.rowLen, n, buf_l, buf_r, write_pos
					);
				}
			}
			write_pos += song.rowLen;
			row++;
		}
	}
	return audio_get_ctx_buffer(mix_buf_l, mix_buf_r);
}

function audio_create_sound(instr, note) {
	let row_len = 5605,
		num_samples = 
			instr.env_attack + instr.env_sustain + 
			instr.env_release - 1 + 32 * row_len,
		buf_l = new Float32Array(num_samples),
		buf_r = new Float32Array(num_samples);
	audio_generate_sound(instr, row_len, note, buf_l, buf_r, 0);
	audio_apply_delay(buf_l, buf_r, num_samples, instr, row_len);
	return audio_get_ctx_buffer(buf_l, buf_r);
}

function audio_init() {
	audio_ctx = new (window.webkitAudioContext||window.AudioContext)();

	// For Safari and our new surprise shitty browser: Chrome
	// https://goo.gl/7K7WLu
	audio_ctx.resume();
}

function audio_get_ctx_buffer(buf_l, buf_r) {
	let buffer = audio_ctx.createBuffer(2, buf_l.length, AUDIO_SAMPLERATE);
	buffer.getChannelData(0).set(buf_l);
	buffer.getChannelData(1).set(buf_r);
	return buffer;
}

function audio_play(buffer, loop) {
	var source = audio_ctx.createBufferSource();
	source.buffer = buffer;
	source.loop = loop;
	source.connect(audio_ctx.destination);
	source.start();
}
