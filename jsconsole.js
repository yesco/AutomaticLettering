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
    x.style.overflow = 'hidden';
    x.style.padding = '0.2em';
    x.style.paddingLeft = '0.5em';
    x.style.position = 'absolute';
    x.style.top = '0';
    x.style.left = '0';
    x.accesskey = 'd'; // not working?
    x.innerHTML = '<input id="DBGcmd" style="background-color:black; color: white; font-size:1em; width:100%;"/></hr><div id="DBGout"></div>';
    document.body.appendChild(x);
    let cmd = dom('DBGcmd');
    cmd.onchange = x=>{
	// hmmm, utility function not here...
	dom(cmd, cmd.value, 'at');
    };
    // store static data in 'function'
    DBG.dom = x;
    DBG.cmd = cmd;
    DBG.cmd.onkeypress = function(k) {
	if (k.keyCode == 13) DBG.run();
    };
    DBG.out = dom('DBGout');
aaa += 'e1';
    DBG.run = function(x){
	if (x === undefined) x = cmd.value;
	if (x === 'clear')
	    return DBGout.innerText = '';
	
	// evaluate js expression
	dom('DBGout', '<b>&gt;' + x + '</b>', 'ha');
	let r;
	try {
	    r = eval(x);
	} catch(e) {
	    r = e;
	}
	
	dom('DBGout', r, 'ha');
	cmd.value = x;
    };
aaa += 'e2';
    function print(args, style) {
	dom('DBGout', args, 'tal', style);
    }
    console.log = function(...args) {
	print(args);
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
    if (DBG.debug) {
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
	    dom('DBGout', ''+ee, 'tal');
	}
    });
}

DBG();

aaa += 'c';
