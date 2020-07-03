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
      let at = sounds.ctx.currentTime + t;
      switch(sched) {
      case '@': ref.setValueAtTime(v, at); break;
      case '-': ref.linearRampToValueAtTime(v, at); break;
      default:
      case '~': ref.exponentialRampToValueAtTime(v, at); break;
      }
    }

    sounds.volume = (c, v, t, sched)=>{
      v = v || 0.001; // 0 not allowed!
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
  // scheduling (obs absolute, set on coming)
  //   ~secs.ms (EXP change to t)
  //   @secs.ms (ABRUPT change AT t)
  //   -secs.ms (LINEAR change to t)
  //   +secs.ms (relaive, ADD time to t))
  //   +   (no number, add same as last)
  //   [~@-]0 resets (for use w other channel)
  // scheduling for (only) notes (automatic!)
  //   /num (length of note, advance T w +/num)
  //   /1  (full note, +)
  //   /2  (half note, +/2
  //   /4 
  //   /8 
  //   /16 
  //   /32 
  //   /0.5 (double! :-o )
  //
  // TODO: change times to MS!!!!
  //   +0.200 /1 A4 /4 A1 A1 - daaa ta ta
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
  // Length: http://neilhawes.com/sstheory/theory12.htm
  // 

  // TODO: beats! 2/4 3/4 ???
  // - http://neilhawes.com/sstheory/theory10.htm
  //   2/4 = Oom pah
  //   3/4 = Oom pah pah
  //   4/4 = Oom Pah pah pah
  //   | move to next bar (move time forard to "next" +
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
  // step the current note time forward
  // controlled by + and /
  function step() {
    T = (T || 0) + add/frac;
  }
  // init
  let sched = '@';
  let T = 0;
  let oct = 4; // yeah
  let add = 0.300;
  let frac = 1;
  let vol = 0.5;
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
      channel, vol = +vmul.value * num(), T, sched); break;
      // frequency
    case 'f': sounds.freq(
      channel, num(), T, sched); break;
      // schedule
    case '~':
    case '@':
    case '-':
      T=num(); sched=c; break;
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
      // channel
    case (c.match(/\d/)          ?c:false):
      channel = +c; break;
      // octave/note
    case 'o': oct = num(); break;
    case 'n': {
      let note = NOTES[num()] + oct;
      sounds.freq(
	channel, NOTE2FREQ[note], f, sched);
      break; }
    case (c.match(/[HBAGFEDC]/)  ?c:false): {
      let note = c;
      if (next('#')) note += '#';
      // allow shorthand! C6HAGFED
      oct = num() || oct; 
      note += oct;
      // play it Sam!
      sounds.freq(
	channel, NOTE2FREQ[note], T, sched);
      step();
      break; }
      // pause, silent note
    case 'p': {
      //step();
      sounds.volume(channel, 0.00001, T, '@');
      step();
      sounds.volume(channel, vol, T, '@');
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
  crystal: '1f440v1\nf441v1\n3f666v1',
  complicated: '1f440v1\n2f449v1\n3f441v1',
  wowo: '1f440v1\n2f441v1',
  ping1: '1f2612qv1~4v0',
  ping2: '1f2616qv1~4v0 2f3v1~6v0',
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
f425+pf425+pf425+pf425+pf425+pf425+p
v0
++++

v1
f950+f1400+f1800+pp
f950+f1400+f1800+pp
f950+f1400+f1800+pp
f950+f1400+f1800+pp
f950+f1400+f1800+pp
v0
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
