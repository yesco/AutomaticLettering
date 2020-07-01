// also stored at codepen
// this gives tons of irriating syntax...
window.onerror = (...args)=>{
  let t = ''+args[0]; //args.toString():
  let b = document.body;
  t = `<div style='color:red;''>${t}</div>`;
  b.insertAdjacentHTML('afterbegin', t);
};
// this will catch any runtime errors
// syntax errors excluded (see above)
window.onerror = (...args)=>{
  let t = ''+args[0]; //args.toString():
  let b = document.body;
  t = `<div style='color:red;'>${t}</div>`;
  b.insertAdjacentHTML('beforend', t);
};
// TODO: visualizations!
// https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createAnalyser
sldkjlksddfj

function sounds(channels) {
  if (!sounds.ctx) {
    channels = sounds.channels = channels || 3;
    let ctx = sounds.ctx = new AudioContext();
    sounds.o = [];
    sounds.g = [];
    // https://mdn.github.io/webaudio-examples/audio-param/
    sounds.volume = function(c, v=0) {
      sounds.g[c].gain.value = v;
    }
    sounds.mute = function() {
      for(let i=0; i<channels; i++)
        sounds.volume(i);
    }

    for(let i=0; i<channels; i++) {
      let o = sounds.o[i] = ctx.createOscillator();
      let g = sounds.g[i] = ctx.createGain();
      o.connect(g);
      sounds.volume(i, 0.3);
      g.connect(ctx.destination);
      o.start(0);
    }
    sounds.mute();
  }
}
// init
var channel = 0;
function silence(s) {
  try {
    s = s || 0.04;
    let g = sounds.g[channel];
    if (typeof g == 'undefined') return;
    g.gain.exponentialRampToValueAtTime(
      0.00001, sounds.ctx.currentTime + s);
  } catch(e) { alert("silence:", e); }
}
function freq(f) {
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
