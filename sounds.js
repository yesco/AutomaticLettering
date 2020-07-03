// (C) 2020 Jonas S Karlsson (jsk@yesco.org)
// this will catch any runtime errors
// syntax errors excluded (see above)

function sounds(x) {
  if (!sounds.ctx) {
    let channels = (typeof x === 'integer') ? x : 10;
    sounds.channels = channels;
    let ctx = sounds.ctx = new AudioContext();
    let o = sounds.o = [];
    let g = sounds.g = [];
    // https://mdn.github.io/webaudio-examples/audio-param/
      function set(ref, sched, v, t) {
	switch(sched) {
	case '@': ref.setValueAtTime(v, t); break;
	case '-': ref.linearRampToValueAtTime(v, t); break;
	default:
	case '~': ref.exponentialRampToValueAtTime(v, t); break;
	}
      }

    sounds.volume = (c, v, t, sched)=>{
      v = v || 0.00001; // 0 not allowed!
      t = t || 0.04; // 0 is clickety
      t = 0.4;
      sched = sched || '~';
      let at = sounds.ctx.currentTime + t;
      set(g[c].gain, sched, v, at);
    }
    sounds.mute = function(t, sched) {
      for(let i=0; i<channels; i++) {
	sounds.g[i].gain.cancelScheduledValues(
	  ctx.currentTime);
	sounds.volume(i, 0, t, sched);
      }
    }

    for(let i=0; i<channels; i++) {
      let o = sounds.o[i] = ctx.createOscillator();
      let g = sounds.g[i] = ctx.createGain();
      o.connect(g);
      o.type = 'sine';
      g.gain.value = 0;
      g.connect(ctx.destination);
      o.start(0);
    }
    //sounds.mute();
  }
  if (typeof x === 'string') {
    try {
      sequencer(x);
    } catch(e) {
      sounds.mute();
      alert("SEQ:" + e);
    }
  }
}

// init
var channel = 0;
function stop(s) {
  try {
    s = s || 0.04;
    let g = sounds.g[channel];
    if (typeof g == 'undefined') return;

    let t = sounds.ctx.currentTime + s;

    g.gain.exponentialRampToValueAtTime(
      0.00001, t);

  } catch(e) { alert("silence:", e); }
}
function freq(f) {
  if (f) {
    let ff = sounds.o[channel].frequency;
    ff.exponentialRampToValueAtTime(
      f, sounds.ctx.currentTime + 5);
  }
  if (f) sounds.o[channel].frequency.value =
    Math.floor(f) || 0;
}
function env(e) {
  if (e) sounds.o[channel].type = e || "sine";
}
function play() {
  freq();
  try {
    //sounds.o[channel].start(0);
  } catch(e) { alert("note:" + e); }
}
function ch(c) {
  function bg(c, col) {
    window['c' + c].style.background = col ||  '';
  }
  bg(0); bg(1); bg(2);
  bg(c, 'green');
  channel = c;
}
function detune() {
  let d = sounds.o[channel].detune;
  if (detune.state = !!detune.state)
    d.setValueAtTime(100, ctx.currentTime);
  else
    d.value = '';
}

// universe i fixed around this!
const A4 = 440

const A0 = A4 * Math.pow(2, -4);
const Q12 = Math.pow(2,1/12);
const C0 = A0 * Math.pow(Q12, -9);

// - frequency of notes (no 'b' use '#')
// NOTE2FREQ['A4'] -> 440
// NOTE2FREQ['C#7'] -> ...
//
// - notes numbered as per below
// NOTE[1] -> 'C'
// NOTE[3] -> 'D'
// NOTE[0] -> 'dummy'
let NOTE2FREQ = {}, NOTES = []; {
  // _   2   4       7  9   11
  // | |C# |D# | | |F# |G# |A# | |
  // | |   |   | | |   |   |   | |
  // | \-------/ | \-----------/ |
  // |   |   |   |   |   |   |   |
  // | C | D | E | F | G | A | H |
  // \---------------------------/
  // _ 1   3   5   6   8  10  12
  //
  let notes = 'C C# D D# E F F# G G# A A# H';
  NOTES = notes.split(' ');

  // Calculate all notes based on C0 !
  NOTES.map((n,i)=>{
    // frequency for n0
    let f = C0 * Math.pow(Q12, i);
    NOTE2FREQ[n + 0] = f;
    // each ocatave is a doubling!
    for(let oct=1; oct<=8; oct++) {
      f *= 2;
      NOTE2FREQ[n + oct] = f;
    }
  });

  // make notes start at 1!
  NOTES.unshift('dummy');

  // Alias B for H (USE vs Scandinavia)
  for(let oct=0; oct<=8; oct++)
    NOTE2FREQ['B' + oct] = NOTE2FREQ['H' + oct];

  // debug: insert all frequencies at end
  if (0)
    document.body.insertAdjacentHTML(
      'beforeend',
      Object.keys(NOTE2FREQ).map(
	(n)=>`${n} = ${NOTE2FREQ[n]}\n`)
	.join('<br>'));
}

function sequencer(s) {
  let orig = s;

  // channel
  //   0-9 (or none for default)
  // envelopes
  //   e (SINe)
  //   q (SqUARE)
  //   t (tRIANGLE)
  //   w (SAw)
  // volume
  //   vnum  (0--1.0, volume)
  //   m (mute all == v0)
  // scheduling
  //   ~secs.ms (EXP change to t)
  //   @secs.ms (ABRUPT change AT t)
  //   -secs.ms (LINEAR change to t)
  // octave
  //   ooct (0--8, set octave, default 4)
  // note
  //   nnote (1--12, C--H)
  // music
  //   [HAGFEDC]#?oct (note)
  //   C#4
  //
  // ' ' space/newline allowed between cmds
  //
  // Notes:
  //   - No sound unless set volume!
  //   - if no number given -> 0
  //   - 'C6HAGFED' - octave shorthand
  //
  // TODO: make more envelopes
  // - https://blog.chrislowis.co.uk/2013/06/17/synthesis-web-audio-api-envelopes.html

  // TODO: if (z === 'undefined') {
  ///g.gain.cancelScheduledValue(
  //sounds.ctx.currentTime);
  //}
  
  // num() extacts+returns immediate number
  // or gives undefined if none
  function num() {
    let n;
    s = s.replace(
      /^\s*([\.\d]+)\s*/,
      (_, _n)=>(n=+_n,''));
    //alert(`NUM: ${n} ${typeof n} s=${s}`);
    return n;
  }

  // next() gives next char
  // next('#') if next if not '#'->undefined
  function next(optC) {
    let c = s[0];
    if (optC && optC !== c) return;
    s = s.substring(1).trim();
    return c;
  }

  // init
  let sched = '';
  let T = 0;
  let oct = 4; // yeah
  channel = 0;
  
  // chars are removed from s as we advance
  while (s) {
    let c = next();

    switch (c) {
      // skip
    case '\n':
    case ' ': break;
      // envelopes
    case 'e': env('sine'); break;
    case 'q': env('square'); break;
    case 't': env('triangle'); break;
    case 'w': env('saw'); break;
      // volume
    case 'm': sounds.mute(); break;
    case 'v': sounds.volume(
      channel, +vmul.value * num(), T, sched); break;
      // frequency
    case 'f': freq(num(), T, sched); break;
      // schedule
    case '~':
    case '@':
    case '-':
      T=num(); sched=c; break;

      // COND-style! LOL
      // channel
    case (c.match(/\d/)          ?c:false):
      channel = +c; break;
      // octave/note
    case 'o': oct = num(); break;
    case 'n': {
      let note = NOTES[num()] + oct;
      freq(NOTE2FREQ[note], f, sched);
      break; }
    case (c.match(/[HBAGFEDC]/)  ?c:false): {
      let note = c;
      if (next('#')) note += '#';
      // allow shorthand! C6HAGFED
      oct = num() || oct; 
      // play it Sam!
      freq(NOTE2FREQ[note], T, sched);
      break; }
    default:
      sounds.mute();
      throw `sounds: unrecongized char '${c}' in "${orig}"`;
    }
  }
  channel = 0;
  return  true;
}

sounds.named = {
  ping1: '1f2612qv1~4v0',
  ping2: '1f2616qv1~4v0 2f3v1~6v0',
  bouncy_steel: '1f2613v1~6v0 1f2v1'
}

function handping() {
  sounds(3);

  // 1f2612qv1~4v0
  channel = 1;
  freq(2612);
  //env('square');
  sounds.volume(channel, 1);
  stop(4);
  
  // 2f3V1S6
  channel = 2;
  freq(3);
  //env('square');
  env('saw')
  sounds.volume(channel, 1);
  stop(6);
}
