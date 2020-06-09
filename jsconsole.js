// poor mans mobile browser console
aaa += 'C';

// TODO: consider adding configurations
// - position: top/bottom/last left/right
// - restore: callback when minimizing
// - key: 'ca-d' or list for help/clear/

// toggle hide/show a given id or dom element
// optShow if true/false will show/hide
// returns true if it is shown
function toggle(idom, optShow) {
    let d = dom(idom);
    console.assert(!d);
    if (!d) alert('toggle() dom id=' + idom + ' not found!');

    d.hidden = !(typeof(optShow) == 'boolean' ? optShow : d.hidden);
    return !d.hidden;
}

function DBG() {
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
<div id=DBG style="max-width:100%; text-size:0.8em;">
  <div style="display:flex; align-items:stretch; max-width:100%;">
    <span id=DBGhelpbutton style="border:0.2em black solid; color:white; background-color:#595959"><b>DBG</b>&gt;</span>
    &nbsp;
    <input id=DBGcmd style="background-color:black; color: white; font-size:1em;"/>
  </div>
  <div id=DBGhelp></div>
  <div id=DBGout style='font-size:0.8em'></div>
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
enter - run the command</br>
scroll -  by sliding</br>
</center>
</div>
<hr noshade/>
`;
    DBG.dom = x;
    DBG.cmd = dom('DBGcmd');
    DBG.cmd.onkeypress = function(k) {
	if (k.keyCode == 13) DBG.run();
    };
    DBG.out = dom('DBGout');
aaa += 'e1';
aaa += 'e1';
    DBG.clear = function() {
	return DBGout.innerText = '';
    }
    DBG.run = function(x){
	if (x === undefined) x = DBG.cmd.value;
	if (x === 'clear') return DBG.clear();
	
	dom('DBGout', '<b>&gt;' + x + '</b>', 'ha');

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
	    dom('DBGout', [''+r], 'ta', 'color:#606060');
	} catch(e) {
	    dom('DBGout', [''+e], 'ta', 'color:red');
	}
	
	// TODO: do we really want this?
	//DBG.cmd.value = x;
    };
aaa += 'e2';
    function print(args, style) {
	dom('DBGout', args, 'tal', style);
    }
    console.log = function(...args) {
	// do we want timestamp?
	dom('DBGout', args, 'ta', 'color: black');
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
	    dom('exp').focus();
	}
	return;
    }
    DBG.toggle(false);

    // set up key stroke activate/hide
    document.addEventListener('keydown', function(e) {
	let c = e.ctrlKey, a = e.altKey, k = e.key;
	if (c && k == 'u') DBG.cmd.value = '';
	if (!c && !a) return;
	// CTRL-ALT-
	if (k == 'd') DBG.toggle();
	if (k == 'l') DBG.clear();
	if (k == 'h') toggle('DBGhelp');
    });
    
aaa += 'e8';
    window.addEventListener('error', function(e) {
	let base = window.location.href.replace(/\/[^\/]*$/, '/');

	let fn = e.filename.replace(base, '').
	    replace(/\/*([^\/]*)$/, function(x) {
		return "<b>" + x + "</b>";
	    });
	try {
	    dom('DBGout', [e.target, e.currentTarget, e.deepPath, fn + '<b>:' + e.lineno + '</b>:' + e.colno + ': ' + e.message, '' + e.error],
		'hal', 'color: red;');
	    // TODO: make this default during load
	    // and then, later, each time minimized reset counter to 0
	    // if minimized, show red counter, don't auto-show
	    DBG.toggle(true);
	} catch(ee) {
	    dom('DBGout', ['dom function error', ''+ee], 't');
	}
    });
    
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

DBG();

aaa += 'c';
