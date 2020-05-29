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
    x.style.padding = '0.2em';
    x.style.position = 'absolute';
    x.style.top = '0';
    x.style.left = '0';
    x.accesskey = 'd'; // not working?
    x.innerHTML = '<input id="DBGcmd" style="background-color:black; color: white; font-size: 1em;"/></hr><div id="DBGout">foobar<br/>fie<br/>fum</div>';
    document.body.appendChild(x);
aaa += 'e1';
    let cmd = dom('DBGcmd');
aaa += 'e2';
    cmd.onchange = x=>{
	// hmmm, utility function not here...
	dom(cmd, cmd.value, 'at');
    };
aaa += 'e3';
    // store static data in 'function'
    DBG.dom = x;
    DBG.cmd = cmd;
    DBG.cmd.onkeypress = function(k) {
	if (k.keyCode == 13) DBG.run();
    };
aaa += 'e4';
    DBG.out = dom('DBGout');
aaa += 'e5';
    DBG.run = function(){
	let x = cmd.value;
	if (x === null) return;
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
    console.log = function(...args) {
	dom('DBGout', args, 'ta');
    }
    console.log("FISH", 1, {a: 11, b: 22}, "foo", console.log);
}

DBG();

aaa += 'c';
