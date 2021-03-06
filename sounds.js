// (C) 2020 Jonas S Karlsson (jsk@yesco.org)
// this will catch any runtime errors
// syntax errors excluded (see above)

function sounds(x) {
  if (!sounds.ctx) {
    let channels = sounds.channels || (typeof x === 'integer') ? x : 30;
    sounds.channels = channels;
    let ctx = sounds.ctx = new AudioContext();
    let o = sounds.o = [];
    let g = sounds.g = [];
    // https://mdn.github.io/webaudio-examples/audio-param/
    function set(ref, sched, v, t) {
      let at = sounds.ctx.currentTime + t;
      switch(sched) {
      case '@': ref.setValueAtTime(v, at); break;
      case '-': ref.linearRampToValueAtTime(v, at); break;
      default:
      case '~': ref.exponentialRampToValueAtTime(v, at); break;
      }
    }

    sounds.volume = (c, v, t, sched)=>{
      v = v || 0.00001; // 0 not allowed!
      t = t || 0.04; // 0 is clickety
      sched = sched || '~';
      set(g[c].gain, sched, v, t);
    }
    sounds.mute = function(t, sched) {
      for(let i=0; i<channels; i++) {
	sounds.g[i].gain.cancelScheduledValues(
	  ctx.currentTime);
	sounds.volume(i, 0, t, sched);
      }
    }

    sounds.freq = function(c, f, t, sched) {
      set(o[c].frequency,
	  sched, Math.floor(f), t);
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

    sounds.play = function(name) {
      sounds(sounds.named[name]);
    }
  }

  if (typeof x === 'string') {
    try {
      sequencer(x);
    } catch(e) {
      sounds.mute();
      alert("SEQ:" + e);
      return false;
    }
  }
  return true;
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
function env(e) {
  if (e) sounds.o[channel].type = e || "sine";
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

// call sequencer with string
// optinonal a display function showing left
function sequencer(s) {
  // DOC:
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
  // scheduling (obs values are relative)
  //   ~secs.ms (EXP change in t)
  //   @secs.ms (ABRUPT change in t)
  //   -secs.ms (LINEAR change in t)
  //   +secs.ms (ADD adds t, store it)
  //   +   (no number, add same as last)
  //   [~@-]0 set ABSOLUTE time to 0
  // scheduling for notes
  //   /num (length of note, advance T w +/num)
  //   /1  (full note, +)
  //   /2  (half note, +/2
  //   /4 
  //   /8 
  //   /16 
  //   /32 
  //   /0.5 (double note! :-o )
  //  change beats per minute
  //   /2=120 (120 beats/m for /2-note)
  //
  //   +0.200 /1 A4 /4 A1 A1 - daaa ta ta
  // 
  //   (TODO: change times to MS!!!!)
  // octave
  //   ooct (0--8, set octave, default 4)
  // note
  //   nnote (1--12, C--H)
  // rest
  //   p (for pause, ADD silent time)
  //   _ (traditional)
  // music
  //   _ (pause, _. = 150%, _.. = 175%)
  //   [HAGFEDC]#?oct (a note)
  //   A4
  //   A   (A in default oct)
  //   C#3
  //   A4HF == A4H4F4 (sets ooct)
  //   
  //     optional additions (no space)
  //     + increase octave (once)
  //     - decrease octave (once)
  //     optinal to lengthen note by:
  //     . +50%         
  //     .. + 50% + 25%
  //     ... + 50% + 25% +1/8th
  // macros!
  //   [name] - play section (from name)
  //   [:name sequence:] name sequence
  //
  // ' ' space/newline allowed between cmds
  //
  // Notes:
  //   - No sound unless set volume!
  //   - if no number given -> 0
  //   - 'C6HAGFED' - octave shorthand
  //
  //
  // === NOT IMPLEMENTED - BELOW HERE ===
  //
  //   TODO: lowercase (abc notation)
  //     TODO: write converter
  //        http://abcnotation.com/blog/2010/01/31/how-to-understand-abc-the-basics/
  //     only inside a bar
  //     low-high: N, N n n'
  //               N' == n  n, == N !
  // Tune then notes
  //   A=420 (change scale to use A=420!)
  //
  // Notes
  //   ^ slurs! (crescent line above notes)
  //   A4^A5
  //    = no pause!
  //     - http://neilhawes.com/sstheory/theory35.htm
  //   syncopiation (shortening of notes)
  //   - http://neilhawes.com/sstheory/theory37.htm
  //   doremesolfa!
  //   - http://neilhawes.com/sstheory/theory39.htm
  //   - https://en.m.wikipedia.org/wiki/Solf%C3%A8ge
  //
  // Bars
  //   &3/4 A4C4 | C4D3 |: HAG :| C4D3 ||
  //
  // Repeats: (NOT IMPLEMENTED)
  //   (...)*2 repeats 2 times, no nesting
  //   |: ... :| same
  //

  // - Length: http://neilhawes.com/sstheory/theory12.htm
  //
  // Beats
  // - http://neilhawes.com/sstheory/theory10.htm
  //   2/4 = Oom pah
  //   3/4 = Oom pah pah
  //   4/4 = Oom Pah pah pah
  //   | move to next bar (move time forard to "next" +
  //
  // TODO: make more envelopes
  // - https://blog.chrislowis.co.uk/2013/06/17/synthesis-web-audio-api-envelopes.html
  // look at
  // - https://en.m.wikipedia.org/wiki/ABC_notation
  // - http://abcnotation.com/
  //
  // ... For the rest - read the SOURCE Luke!
  // ENDDOC
  let orig = s;

  // TODO: if (z === 'undefined') {
  ///g.gain.cancelScheduledValue(
  //sounds.ctx.currentTime);
  //}
  
  function vfactor() {
    return (typeof vmul === 'undefined')?
      1 : +vmul.value;
  }
  // num() extacts+returns immediate number
  // or gives undefined if none
  function num() {
    let n;
    s = s.replace(
      /^\s*([\.\d]+)\s*/,
      (_, _n)=>(n=+_n,''));
    return n;
  }
  function digit() {
    let n;
    s = s.replace(
      /^(\d)\s*/,
      (_, _n)=>(n=+_n,''));
    return n;
  }
  // next() gives next char
  // next('#') if next if not '#'->undefined
  function next(optC) {
    let c = s[0];
    if (optC && optC !== c) return;
    // if match => eat it up!
    s = s.substring(1).trim();
    return c; // basically 'true'
  }
  // step the current note time forward
  // controlled by + and /
  function step(optMul) {
    T = (T || 0) + (optMul || 1) * add/frac;
  }
  
  // remove comments (unnamed macros!)
  s = s.replace(/\[:\s+[\s\S\n]*?\s*:\]/g, ' ');

  // extract macros
  let defs = {};
  s = s.replace(
    /\[:(\w+)([\s\S]*?)\s*:\]/g,
    (_, name, def)=>{
      defs[name] = def;
      return ''});

  // use local first, then library or loaded
  function finddef(name) {
    return def = defs[name] ||
      sounds.named[name];
  }
  
  function playnote(note) {
    // read dots - as multiplier for time
    let mult = 1, pot = 1/2;
    while(next('.')) {
      mult += pot;
      pot /= 2;
    }
    
    if (note === '_') { // rest = silent note
      sounds.volume(channel, 0.001, T, '@');
      step(mult);
      // TODO: a way to turn on sound later?
      // the next sound should do it
      // 'v1 f440+_f0+_f440+_ v0'
      sounds.volume(channel, vol, T, '@');
    } else {
      sounds.freq(
	channel, NOTE2FREQ[note], T, sched);
      step(mult);
    }
  }

  // init
  let sched = '@';
  let T = 0;
  let add = 0.300;
  let frac = 1;
  let vol = 0.5;
  let freq = 440;
  let oct = 4;
  
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
      channel, vol = +vfactor() * num(), T, sched); break;

      // frequency
    case 'f': sounds.freq(
      channel, freq = num(), T, sched); break;

      // schedule
    case '~':
    case '@':
    case '-': {
      let t = num();
      T = (t === 0) ? 0 : T + t;
      sched=c;
      break; }
    case '+': {
      let n = num();
      if (n)
	add = n
      else
	T = (T || 0) + add;
      break; }
    case '/': {
      let n = num()
      frac = n ? n : 1;
      break; }
    case '=': {
      let bpm = num();
      add = 60 / frac / bpm;
      break; }  

      // channel
    case (c.match(/\d/)          ?c:false):
      // TODO: create local ones!!!
      channel = +c; break;

      // octave / note
    case 'o': oct = num(); break;
    case 'n': 
      playnote(NOTES[num()] + oct); break;
    case (c.match(/[HBAGFEDC]/)  ?c:false): {
      let note = c;
      if (next('#')) note += '#';
      // allow shorthand! C6HAGFED
      if (next('-') || nex(','))
	note += (oct - 1);
      else if (next('+') || next("'"))
	note += (oct + 1);
      else
	note += (oct = digit() || oct);
      playnote(note);
      break; }

      // rest, pause, silent note
    case '_': playnote('_'); break;

      // named macro invocaton
    case '[': {
      let name;
      s = s.replace(
	/^(\w+)\]/g,
	(_,n)=>{name=n; return ''});
      if (!name) return alert('SEQ: no name in play name: [' + s);
      let d = finddef(name);
      if (!d) return alert('SEQ: No play named: ' + name);
      // push body on queue
      s = d + '  ' + s;
      break; }
    case '|': {
      break; }
    //case '*': {
    //break; }

    default:
      sounds.mute();
      throw `sounds: unrecongized char '${c}' in "${orig}"`;
      
    }
  }
  channel = 0;
  return  true;
}

sounds.named = {
  crystal: '1f440v1\nf441v1\n3f666v1',
  complicated: '1f440v1\n2f449v1\n3f441v1',
  wowo: '1f440v1\n2f441v1',
  ping_echo: '8f2616qv1~4v0 9f3v1~6v0',
  paris_gris: `v1 o5 /2=240
[hag]
[hag]
A_A_ _
D+_C+_
[hag]

v0
  
[:hag H_A_G__ :]
`,
  oric_ping: '1f2612qv1~4v0',
  oric_zap: '7v1 qf4000-0.2v1f360 v0',
  oric_key: '@0 v0 qf5500 v1 ~0.23f19\n@0 v1      ~0.07v0',
  oric_okey: '@0 v0 qf5500 v1 ~0.23f2\n@0 v1      ~0.07v0',
  bouncy_steel: '1f2613v1~6v0 1f2v1',
  space: '1f30~1f7740v1@1v0',
  drop: '1f5740-0.7f300\nv1@0.7v0',
  shot: '1f3000~0.1f80\nv1@0.1v0',
  whissle: '1f2000~0.1f4000\nv1@0.1v0',
  TwoTones1: 'v0.5 +0.2 @0 f440++f523+v0',
  TwoTones2: 'v0.5 +0.2 A4/2C4 v0',
  SwedishPhones: `
v1 +0.3
f425++++++++
f425+_f425+_f425+_f425+_f425+_f425+_
v0
++++

v1
f950+f1400+f1800+__
f950+f1400+f1800+__
f950+f1400+f1800+__
f950+f1400+f1800+__
f950+f1400+f1800+__
v0
`,
  borst: 'v1 f425~0.6f20000 v1-1v0',
  borst2: 'v1 f425~0.6f20000 2f2000~1f200 v1-1v0',
  tjiong: '1e @0 v1 ~0f7777+f1000 -1v0\n2q @0 v1 ~0f7000+f100 ~1v0',
  echo: `
1e
[: first control frequencies and timing :]
@0 ~0.1 v1 [y][y]
[: then in PARALLEL volume falling :]
@0 ~v1+++ +++v0

[:y [x][x][x] :]
[:x f400 + f1000 :]

v0
`,
  echoUnderseas: `
1e
[: first control frequencies and timing :]
@0 ~0.1 v0.4 [y][y]
[: then in PARALLEL volume falling :]
@0 ~v1+++ +++v0

[:y [x][x][x] :]
[:x f2000 + f1000 :]

v0
`,
  echoInSpace: `
1e
[: first control frequencies and timing :]
@0 ~0.1 v0.4 [y][y]
[: then in PARALLEL volume falling :]
@0 ~v1+++ +++v0

[:y [x][x][x] :]
[:x f4000 + f9000 :]
`,
  small_clock_stroke: `
1 @0 [a]
2 @0 v0.1 f300v1~1v0

[:a v1A4v1~1v0p :]
`,
  hit_something_tinny_on_heavy: `

1 @0 [a]
2 @0 v0.1 f30v1~0.7v0

[:a v1A4v1~1v0p :]
`,
  
}

function handping() {
  sounds(3);

  // 1f2612qv1~4v0
  channel = 1;
  sounds.freq(channel, 2612);
  //env('square');
  sounds.volume(channel, 1);
  stop(4);
  
  // 2f3V1S6
  channel = 2;
  sounds.freq(channel, 3);
  //env('square');
  env('saw')
  sounds.volume(channel, 1);
  stop(6);
}
