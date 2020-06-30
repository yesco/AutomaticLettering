// poor mans mobile browser console
if (typeof aaa === 'undefined') aaa = '';
aaa += 'C';

// TODO: consider adding configurations
// - position: top/bottom/last left/right
// - restore: callback when minimizing
// - key: 'ca-d' or list for help/clear/

function DBG(i, v) {
  // nasty way to set 'any' property
  //   noerr  - ignores errors
  //   logerr - don't toggle DBG on at error
  if (i) return DBG[i]=v;
    
  let x = document.createElement('div');
  x.id = 'DBG';
  x.style.backgroundColor = 'white';
  x.style.color = 'black';
  x.style.fontSize = '0.8em';
  x.style.fontWeight = 'normal';
  x.style.fontFamily = 'Ariel';
  x.style.textAlign = 'left';
  x.style.maxWidth = '100%';
  // this prevents automatic zoomoing, and one
  // can drag sideways, and no wrap so things
  // take up many lines!
  x.style.overflowX = 'scroll';
  x.style.padding = '0.2em';
  x.style.paddingLeft = '0.3em';
  x.style.position = 'absolute';

  // TODO: make configurable by parameter
  // - top right corner
  // - top left corner
  x.style.top = '0';
  // - "after" the current page, fixed pos
  //let h = document.body.scrollHeight;
  //x.style.top = h + 200;
  // - "last" add as last dom elemeent

  x.style.left = '0';
  x.accesskey = 'd'; // not working?
  x.innerHTML = `
<div id=DBG style="max-width:100%; text-size:0.8rem; font-family:Lucida Console;">
  <div style="display:flex; align-items:stretch; max-width:100%;">
    <span id=DBGhelpbutton style="border:0.2em black solid; color:white; background-color:#595959"><b>DBG</b>&gt;</span>
    &nbsp;
    <input id=DBGcmd style="background-color:black; color: white; font-size:1em;"/>
    <a target='new' href='https://codepen.io/pen/'>CodePen</a>
  </div>
  <div id=DBGhelp hidden=true></div>
  <div id=DBGout style='font-size:18px; font-family:Ariel;'></div>
</div>
`;
  document.body.appendChild(x);

  // store static data in 'function'
  // TODO: DBGcmdbutton, DBGhelp
  dom('DBGhelpbutton').onclick = function() {
    toggle('DBGhelp');
  }
  dom('DBGhelp').innerHTML = `
<div style='font-size:0.6em;font-family:Ariel;'>
<center><div style='font-size:2em;'>DBG HELP</div>
<div style='font-size:0.5em'>(poor mans mobile debug console)</div>
[DBG] - button will toggle help</br>
ctrl-alt-<b>D</b> - toggle the DBG pane</br>
ctrl-alt-<B>H</b> - toggle the DBG help</br>
ctrl-alt-<b>L</b> - clear the DBG log</br>
ctrl-<b>U</b> - clear the command</br>
ctrl-<b>I</b> - inspect value</br>
ctrl-<b>J</b> - print as JSON</br>
enter - run the command</br>
scroll -  by sliding</br>
</center>
</div>
<hr noshade/>
`;
  DBG.dom = x;
  DBG.cmd = dom('DBGcmd');
  // restore last saved cmd
  DBG.cmd.value = lsget('DBG.cmd');

  DBG.cmd.onkeypress = function(k) {
    if (k.keyCode == 13) DBG.run();
  };
  DBG.out = dom('DBGout');
  aaa += 'e1';
  aaa += 'e1';
  DBG.clear = function() {
    return DBGout.innerText = '';
  }

  DBG.zoom = function(k) {
    if (!k) k = lsget('DBG.zoom');
    let z = dom('DBG').style.zoom;
    z = +z;
    if (!z) z = 1;
    z *= k;
    dom('DBG').style.zoom = z;
    lsput('DBG.zoom', z);
  };
  DBG.zoom();

  DBG.run = function(x){
    if (x === undefined) x = DBG.cmd.value;

    // handle commands
    let params = x.split(/\s+/g);
    switch (params.shift()) {
    case '/clear': return DBG.clear();
    case '/html': return;
    case '/vars': return;
    case '/top': return;
    case '/style': return;
    case '/load': return loadScript(params[0]);
    }

    lsput('DBG.cmd', x);
    DBG.run.count = (DBG.run.count || 0)+1;

    // TODO: add <div> resluts </div>
    // where to update result!
    dom('DBGout', `<b>&gt;${quoteHTML(x)}</b></br><div id='DBG.res${DBG.run.count}'></div>`, 'hp');

    // evaluate js expression
    // TODO: var f=function(x){ return x+x; {
    // f(3) doesn't work
    // but var f; .. f=func...; and f(3) does!?
    // TODO: quote it before 'h' printing...
    try {
      let r = x.endsWith(';') ?
	  eval(x) :
	  eval('(' + x + ')');

      // TODO: how to print if dom/html?
      // want to click to inspect
      // One click handler is enough? make these run commands clickable -> copy to cmd.value
      // TODO: our own pretty printer?
      // -> give links to transfor cmd and run
      // - Object.keys(x)
      // - JSON.stringify(x) parse?
      // - option to wrap displayed container
      // - copy current comman to cmd
      // - popup inspector?
      dom(`DBG.res${DBG.run.count}`, r, 't', 'color:#606060');
    } catch(e) {
      dom(`DBG.res${DBG.run.count}`, e, 't', 'color:red');
    }
    
    // TODO: do we really want this?
    //DBG.cmd.value = x;
  };
  aaa += 'e2';
  function print(args, style) {
    dom('DBGout', args, 'tpl', style);
  }
  console.log = function(...args) {
    // do we want timestamp?
    dom('DBGout', args, 'tp', 'color: black');
  }
  console.html = function(...args) {
    // do we want timestamp?
    dom('DBGout', args, 'htp', 'color: black');
  }
  console.error = function(...args) {
    // TODO: count errors and show them even if visualized, zero at view
    print(args, 'color: red;');
    toggle('DBG', true);
  }
  console.info = function(...args) {
    print(args, 'color: blue;');
  }
  console.warn = function(...args) {
    print(args, 'color: #ff9968;');
  }

  DBG.visible = true;
  DBG.toggle = function(optState) {
    if (toggle('DBG', optState)) { // shonw
      // TODO: save old scrollpos
      // TODO: save focus
      // TODO: save caret
      // TODO: save selection
      // TODO: alt, DBG( { restore: }
      //	    DBG.oldFocus = document.activeElement;
      //	    DBG.oldCaretPos = window.getSelection();
      DBG.cmd.focus();
      //	    dom('DBGcmd').focus();
    } else {
      // TODO: restore cursor
      // TODO: move out of there, this is automatic specific!
      let d = document.getElementById('exp');
      if (d) d.focus();
    }
    return;
  }
  DBG.toggle(false);

  DBG.inspect = function(exp, how) {
    if (exp === undefined) exp = DBG.cmd.value;
    if (exp === '') return;
    lsput('DBG.cmd', exp);

    let v;
    try {
      // TODO: if it's a function call
      // we'll call it potentially several
      // times. Possible set variable,
      // and replace exp by it...
      // or just cache if same as last?
      let x = '(' + exp + ')';
      v = eval(x);
    } catch(e) {
      return console.error('inspect.eval:', e, `of >${x}<`);
    }

    try {
      console.html([
	((how || '').match('j') ? '<b>JSON&gt;</b> ' : 	'<b>inspect&gt;</b> '),
	quoteHTML(exp), '</br>',
	inspect_value(v, how, exp)
      ]);
    } catch (e) {
      return console.error('inspect_value:', e, `of >${v}<`);
    }
  }

  // set up key stroke activate/hide
  document.addEventListener('keydown', function(e) {
    let c = e.ctrlKey, a = e.altKey, k = e.key;
    if (c && !a && k == 'u') DBG.cmd.value = '';
    if (c && !a && k == 'i') DBG.inspect();
    if (c && !a && k == 'j') DBG.inspect(undefined, 'j');
    if (c && a && k == '=') DBG.zoom(1.1);
    if (c && a && k == '-') DBG.zoom(1/1.1);

    if (!c || !a) return;
    // CTRL-ALT-
    if (k == 'd') DBG.toggle();
    if (k == 'l') DBG.clear();
    if (k == 'h') toggle('DBGhelp');
  });
  
  aaa += 'e8';
  // https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
  window.addEventListener('error', onerror);
  
  function onerror(e) {
    if (DBG.noerr) return;
    let base = window.location.href.replace(/\/[^\/]*$/, '/');

    let fn = e.filename.replace(base, '').
	replace(/\/*([^\/]*)$/, function(x) {
	  return "<b>" + x + "</b>";
	});
    try {
      dom('DBGout', [e.target, e.source, e.currentTarget, e.deepPath, fn + '<b>:' + e.lineno + '</b>:' + e.colno + ': ' + e.message, '' + e.error],
	  'hal', 'color: red;');
      // TODO: make this default during load
      // and then, later, each time minimized reset counter to 0
      // if minimized, show red counter, don't auto-show
      if (DBG.logerr) return false;
      DBG.toggle(true);
    } catch(ee) {
      dom('DBGout', ['dom function error', ''+ee], 't');
    }
    return false;
  }
  
  if (0 || DBG.debug) {
    aaa += 'e3';
    console.log('log', 1, {a: 11, b: 22}, "foo", console.log);
    aaa += 'e4';
    console.info('info');
    aaa += 'e5';
    console.warn('warn');
    aaa += 'e6';
    console.error('error');
    aaa += 'e7';
  }
  aaa += 'e9';
}

// init
DBG();

{
  let d = document.createElement('style');
  d.innerText = `
.ptype, .pkey, .pfunc, .pname, .plabel, .pdata{
  all: unset;
  color: black;
  font-weight: bold;
  font-size: 1.0rem;
  border-radius: 10px;
  padding-left: 0.8rem;
  padding-right: 0.8rem;
}
.ptype {
  color: white;
  background-color: black;
}
.pkey {
  background-color: lime;
}
.pdata {
  background-color: lightgrey;
  zoom: 0.9;
}
.pfunc {
  background-color: cyan;
}
.pname {
  color: blue;
  background-color: white;
}
.plabel {
}
`;
  document.body.appendChild(d);
}

aaa += 'c';
