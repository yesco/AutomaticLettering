// 2020 (c) jsk@yesco.org
// A tiny implementation of JML
// Jolly Macro Language
// - It's totally functional
// - No variables!
// - Everything is strings
// - It's live extensible inside itself
// - Only state is external
// - Database: keyword put/get usng localStorage
function jml(x, opts) {
  // TODO: if called with a dom element
  //   traverse it and run on whole TextNodes
  if (opts) {
    // can't be let ;)
    var oPass = opts.match(/pass/);
    var oStep = opts.match(/step/);
    var oTrace = opts.match(/trace/);
    var oTick = opts.match(/tick/);
    // TODO: ultimately for 'tick' we let it run about 5ms, then yielding back to the browser, thereby not blocking it's interactivity!
    if (oTick) oStep = true;
  }
  let start = Date.now();

  if (typeof jml.init === 'undefined')jml_init();
  if (typeof x === undefined) return;
  if (typeof x !== 'string') x = '' + x;
    
  // TODO: make sure newlines are ok
  let regexp = oStep ?
      /\[([^\[\]]*?)\s*\]/ :
      /\[([^\[\]]*?)\s*\]/g ;
  let n = 1, p = 0, t = 0;
  while (n > 0) {
    p++;
    n = 0;
    x = x.replace(regexp, function(all, inside) {
      n++;
      // TODO: can spaces be retained?
      let args = inside.split(/\s+/g);
      let f = args.shift();
      let fun = jml.f[f];
      let ff = f;
      // TODO: move out - too long!
      //
      // if no fun backtrack:
      //     [foo-bar-fie-3 4 5]  becomes
      //  => [foo-bar fie 3 4 5] a.s.o.
      //  => [foo bar fie 3 4 5] a.s.o.
      //  => [error foo-bar-fie 3 4 5] a.s.o.
      //
      //  if have '/' in  path, don't go past
      //     [foo-bar/fie-fum 3 4 5]
      //  => [foo-bar/fie fum 3 4 5]
      //  => [error foo-bar/fie-fum 3 4 5]
      while (!fun && ff.match(/-[\/]*$/)) {
	ff = ff.replace(/-([^\-\/]*)$/, (a)=>{
	  args.unshift(a);
	  return '';
	});
	console.error(`%%FUN: ${f} ${ff}`);
	fun = jml.f[ff];
      }
      if (!fun) return '[error ' + inside + ']';
      return '' + fun.apply(undefined, args);
    });
    if (oTrace) console.info(n, '!', x);
    t += n;
    if (oPass || oStep) break;
  }

  return x;
}

function x(x, test) {
  let xr = x.match(/^(pass: |fail: )(.*?) -> (.*?)(| (expected:) (.*?))$/);
  if (xr) {
    let [all, outcome, exp, result, hasExpected, expectWord, expected] = xr;
    //console.log('---');
    //console.log('xr', xr);
    x = exp;
    test = expected ? expected : result;
  } 
  
  let r = test ? test : jml(x);
  return xx(x, r);
}

function xx(x, test) {
  if (test) {
    let r = jml(x);
    let e = (r !== test);
    let es = e ? 'fail' : 'pass';
    // if error, write both to err and out if capturing to file...
    if (e) {
      console.error(`r=>${r}< test=>${test}< ===${r==test}`);
    }
    if (e) r += ' expected: ' + test;
    if (e)
      console.error(`${es}: ${x} -> ${r}`);
    console.log(`${es}: ${x} -> ${r}`);
  } else { // interactive
    console.log(">", x);
    console.log(jml(x));
  }
}

if (0) {
x('3');
x('3+4='+jml.f.plus('3','4'));
x('3*4='+jml.f.times('3','4'));
x('3*4='+jml.f.times.apply(undefined, ['3','4']));
x('333 33');
x('[plus 3 4]')
x('[plus 3 [times 4 5] 6]');
x('[iota 1 10]');
x('[iota 3 7]');
x('[iota 3 3]');
x('[iota 3 2]');
x('[3] [4] [333]');
x('[plus [iota 1 10]]');
x('[times [iota 1 10]]');
x('[count [iota 1 10]]');
x('[count]');
x('[count ]');
x('[count  ]');
x('[count   ]');
x('[count  1 2]');
x('[count  1 2 ]');
x('[count  1 2   3     ]');
x('[lt]');
x('[lt 0]');
x('[lt 0 1]');
x('[lt 1 0]');
x('[ordered]');
x('[ordered 0]');
x('[ordered 0 1]');
x('[ordered 0 1 2]');
x('[ordered 0 1 2 2 3]');
x('[ordered 0 1 2 1 3]');
x('[not]');
x('[not 0]');
x('[not 1]');
x('[not 3]');
x('[not -1]');
x('[not a]');
x('[not null]');
x('[not true]');
x('[not false]');
x('[not 0]');
x('[not 0 0]');
x('[not 0 1]');
x('[not 1 0]');
x('[not 1 1]');
x('[not]');
x('[not 0]');
x('[not 00]');
x('[not 000]');
x('[not [not 1] [not 1]]');
x('[not [not 1] [not 0]]');
x('[not [not 0] [not 1]]');
x('[not [not 0] [not 0]]');
x('[map not 1 0]');
x('[and]');
x('[and 1]');
x('[and 1 1]');
x('[and 1 1 1]');
x('[and 0]');
x('[and 1 0]');
x('[and 0 1]');
x('[and 0 0]');
x('[and 0 1 0]');
x('[and 1 1 0]');

x('[or]');
x('[or 0]');
x('[or 1]');
x('[or 0 0]');
x('[or 0 1]');
x('[or 1 0]');
x('[or 1 1]');
x('[or 0 0 1]');
x('[or 0 0 0]');

x('[or 0 0 0]', '0');
x('[or 0 0 1]', '1');
x('[or 1 1 1]', '0');
}

// if run from nodejs make it interactive
if (typeof require !== 'undefined') {
    var readline = require('readline');
    var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
	//  terminal: true,
    });

    rl.on('line', function(line){
	x(line);
	//console.log(line);
    })
}

//jml_tests('jml.test');

function jml_init() {
  jml.f = {};
  jml.libs = {};
  jml.lorder = [];
  jml.logdb = [];
  jml.init = true;

  // methods

  // primitives
  jml.f.plus = (...args)=>args.reduce((a,x)=>(+a)+(+x), 0);
  jml.f.minus = (a,b)=>(+a)-(+b);
  jml.f.times = (...args)=>args.reduce((a,x)=>(+a)*(+x), 1);
  jml.f.divide = (a,b)=>(+a)/(+b);
  jml.f.iota = function(f,t) {
    var r = '';
    while(f <= t) {
      r += f + ' ';
      f++;
    }
    return r;
  };
  jml.f.count = (...args)=>args.length;
  jml.f.eq = (a,b)=>a==b;
  jml.f.lt = (a,b)=>a<b?1:0;
  jml.f.le = (a,b)=>a<=b?1:0;
  jml.f.ge = (a,b)=>a>=b?1:0;
  jml.f.gt = (a,b)=>a>b?1:0;
  jml.f.ordered = (...args)=>{
    for(let i=0; i<args.length-1; i++)
      if (args[i] > args[i+1]) return 0
    return 1;
  };
  jml.f.not = (...args)=>args.join('').match(/^0+$/)?1:0;
  jml.f.map = (f, ...args)=>args.map(x=>`[${f} ${x}]`).join(' ');
  jml.f.and = (...args)=>`[not [map not ${args.join(' ')}]]`;
  jml.f.or = (...args)=>`[not [not ${args.join(' ')}]]`;
  jml.f.mor = ()=>`[not [not ${this}]]`;

  jml.f['en'] = (x, y)=>`[en-word-${x} ${y}]`;
  jml.f['en-word-3'] = (y)=>'three:'+y;
  jml.f['en-word-2'] = (y)=>'two'+y;
  jml.f['en-word-1'] = (y)=>'one'+y;
  jml.f['en-word'] = (x, y)=>'NO: '+y;

  function mkArray(n, func) {
    return [...Array(n)].map(func);
  }
  
  function quoteHTML(h) {
    return h.replace(/([<>\[\]])/g, x=>`&#${x.charCodeAt(0)};`);
  }

  // html
  jml.f['make-table'] = (rows, cols, func, ...data)=>{
    // DOC: makes a table each call defined by [func r c ...data]
    // EX: [make-table 6 6 times]
    let d = data.join(' ');
    return '<table border=1><tr><td>' +
      mkArray(
	+rows,
	(_, r)=>mkArray(
	  +cols,
	  (_, c)=>`[${func} ${r} ${c} ${d}]`
	).join('</td><td>')
      ).join('</td></tr><tr><td>') +
    '</td></tr></table>';
  };

  // IO

  // TODO: same/similar function inside ALd/index.html
  // send a request with id TID to URL path WHAT with DATA encoded as query parameters ('?')
  //   TID    typically 'tXXXX...' a unique id
  //   URL    like 'http://yesco.org/'
  //   WHAT   like 'get' or ''
  //   DATA   {a: 45, b:'foo'}
  //   cbOK   optional called when recieved answer
  //   cbFail optional called at error

  //     cb(resptext, resp)
  function sendjsonp(tid, url, what, data, cbOK, cbFail) {
    sendjsonp[tid] = {
      tid: tid,
      url: url,
      what: what,
      data: data,
      cbOK: cbOK,
      cbFail: cbFail
    };

    function show(status) {
      console.info(`send: ${status} for ${tid} of ${what} ${data}`);
    }
    cbOK = cbOK || (t=>show(t));
    cbFail = cbFail || (t=>show(`(err ${r.status}) ${t}`, 'red'));

    let r = document.createElement('script');
    sendjsonp[tid].scriptdom = r;

    // build url
    let u = new URL(url + what);
    if (data) 
      for (const k in data)
	u.searchParams.append(k, data[k]);

    if (!u.searchParams.get('jsonp')) {
      u.searchParams.append('jsonp', 'window.jmlrecvjsonp');
    }

    // ask for it
    r.src = u.href;
    document.body.appendChild(r);
  }
  
  window.jmlrecvjsonp = function recvjsonp(tid, data) {
    alert(`recvjsonp: ${tid} data=${data}<`);
    let req = sendjsonp[tid];
    console.info(`recvjsonp: ${tid} ${data}`);

    let cbOK = req.cbOK;
    cbOK(data, { status: '200' });

    // TODO: how to detect error?
    // cbFail(data, { status: '404' });

    // cleanup - remove script tag
    let r = req.scriptdom;
    r.parentNode.removeChild(r);
    delete sendjsonp[tid];

    return data;
  }


  function send(tid, url, what, data, cbOK, cbFail) {
    send[tid] = {
      tid: tid,
      url: url,
      what: what,
      data: data,
      cbOK: cbOK,
      cbFail: cbFail
    };

    let r = new XMLHttpRequest();
    function show(status) {
      console.info(`send: ${status} for ${tid} of ${what} ${data}`);
    }
    cbOK = cbOK || (t=>show(t));
    cbFail = cbFail || (t=>show(`(err ${r.status}) ${t}`, 'red'));

    r.onreadystatechange =
      function() {
	if (r.readyState==4) {
	  // TODO: handle redirects?
	  if (r.status==200)
	    cbOK(r.responseText, r);
	  else
	    cbFail(r.responseText, r);
	}
      };

    // build url
    let u = new URL(url + what);
    if (data) 
      for (const k in data)
	u.searchParams.append(k, data[k]);

    // ask for it
    r.open('GET', u.href, true);

    // xhr.onload = function () {
    // Request finished. Do processing here.
    // };

    // xhr.timeout = 2000; // time in milliseconds
    // xhr.ontimeout = function (e) {
    // XMLHttpRequest timed out. Do something here.
    // };
    
    // send data to server
    // r.setRequestHeader('Content-Type', 'text/xml');
    // r.send(xml); // also concludes request
    try {
      let res = r.send(null);
      console.info("send: result", res);
    } catch (e) {
      console.error("send: error", e);
    }
  }

  
  function wakeup(tid) {
    // call when id resolved
  }
  
  let wait_result = {}; // tid -> result

  jml.f.send = function(tid, url, fun, ...args) {
    return sendinternal(send, tid, url, fun, ...args);
  }

  jml.f.sendjsonp = function(tid, url, fun, ...args) {
    return sendinternal(sendjsonp, tid, url, fun, ...args);
  }

  function sendinternal(sender, tid, url, fun, ...args) {

    let ARGS = args.join(' ');
    if (!fun) fun = 'identity';
    console.info(`[send ${tid} ${url} ${fun} ${ARGS}]`);
    sender(tid, url, '', null,
	 (txt,res)=>{
	   wait_result[tid] = `[${fun} ${ARGS} ${txt}]`;
	   wakeup(tid);
	 },
	 (err,res)=>{
	   wait_result[tid] = `[${fun}/error ${ARGS} ${err}]`;
	   wakeup(tid);
	 }
	);
    return `[wait ${tid} 0 ${fun} ${ARGS}]`;
  };
  jml.f.wait = function(tid, count, fun, ...args) {
    let r = wait_result[tid];

    // update
    if (r !== null && r !== undefined) {
      wait_result[tid] == '';
      return r;
    }
    
    // wait more again
    let ARGS = args.join(' ');
    count++;
    return `[wait ${tid} ${count} ${fun} ${ARGS}]`;
  };
  
  // -- library
  jml.f.ignore = _=>'';
  jml.f.identity= (...args)=>args.join(' ');
  
  // -- system
  function error(f, args) {
    let r = '<%%ERROR:' + f + ' ' + args + '%%>';
    console.error('JML:', r);
    return r;
  }
  jml.f.error = function(f, ...args) {
    error(f, args);
  };

  jml.f.fun = (n)=>'<pre style="text-align:let;">'+quoteHTML(''+jml.f[n])+'</pre>';
}
