// poor mans mobile browser console
aaa += 'C';

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
    x.style.top = '0';
    x.style.left = '0';
    x.accesskey = 'd'; // not working?
    x.innerHTML = '<div style="display:flex; align-items:stretch; max-width:100%;"><span id=DBGhelpbutton href="#" style="border: 0.2em black solid; color:white; background-color:black;"><b>DBG</b>&gt;</span>&nbsp;<input id=DBGcmd style="background-color:black; color: white; font-size:1em;"/></div><div id=DBGhelp><div id=DBGout></div>';
    document.body.appendChild(x);

    // store static data in 'function'
    // TODO: DBGcmdbutton, DBGhelp
    DBG.dom = x;
    DBG.cmd = dom('DBGcmd');
    DBG.cmd.onkeypress = function(k) {
	if (k.keyCode == 13) DBG.run();
    };
    DBG.out = dom('DBGout');
aaa += 'e1';
    DBG.clear = function() {
	return DBGout.innerText = '';
    }
    DBG.run = function(x){
	if (x === undefined) x = DBG.cmd.value;
	if (x === 'clear') return DBG.clear();
	
	dom('DBGout', '<b>&gt;' + x + '</b>', 'ha');

	// evaluate js expression
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
    }
    console.info = function(...args) {
	print(args, 'color: blue;');
    }
    console.warn = function(...args) {
	print(args, 'color: #ff9968;');
    }

    DBG.visible = true;
    DBG.toggle = function(optState) {
	// default is toggle
	DBG.visible = !DBG.visible;
	// unless 'off' or any true string
	if (optState) {
	    if (optState == 'off')
		DBG.visible = false;
	    else
		DBG.visible = true;
	}

    	if (DBG.visible) {
	    DBG.dom.style.display = 'block';
	    DBG.oldFocus = document.activeElement;
	    DBG.oldCaretPos = window.getSelection();
	    DBG.cmd.focus();
	} else {
	    DBG.dom.style.display = 'none';
	    //alert(document.activeElement == DBG.cmd);
	    // restore old position before
	    // https://stackoverflow.com/questions/6190143/javascript-set-window-selection
	    // no such function - window.setSelection(DBG.oldCaretPos);
	    
	    dom('exp').focus();
	}
    }
    DBG.toggle('off');

    // set up key stroke activate/hide
    document.addEventListener('keydown', function(k) {
	if (k.altKey && k.ctrlKey && k.key == 'd')
	    DBG.toggle();
	
	if (k.ctrlKey && k.key == 'c')
	    DBG.clear();
    });
    
aaa += 'e8';
    window.addEventListener('error', function(e) {
	let base = window.location.href.replace(/\/[^\/]*$/, '/');
	let fn = e.filename.replace(base, '').
	    replace(/\/*([^\/]*)$/, function(x) {
		return "<b>" + x + "</b>";
	    });
	try {
	    dom('DBGout', [fn + '<b>:' + e.lineno + '</b>:' + e.colno + ': ' + e.message, '' + e.error],
	    'hal', 'color: red;');
	    // TODO: make this default during load
	    // and then, later, each time minimized reset counter to 0
	    // if minimized, show red counter, don't auto-show
	    DBG.toggle('on');
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
