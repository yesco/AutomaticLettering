// 2020 (c) jsk@yesco.org
// A tiny implementation of JML
// Jolly Macro Language
// - It's totally functional
// - No variables!
// - Everything is strings
// - It's live extensible inside itself
// - Only state is external
// - Database: keyword put/get using localStorage

// TODO-----------
// 1 - facts = store
// {NAME VALUE} -> {hUSER:NAME VALUE}
// {SPACE:NAME VALUE} -> {hSPACE:NAME VALUE}
// {hSPACE:NAME VALUE} -> fact(tid, n, v)
// {fun ^a^b BODY} -> {fun ^a^b BODY}
//
// 2 - immediate = macro pre-processor!
// (subst #TS# (timestamp) ...) !
// (timestamp ...#TS#...) = transaction/group
// (table tbody) (td t) (tr t)
//
// 3 - last = future
// [fact NAME VALUE] -> ... -> fact()
//
// - GET?
// [NAME ...] -> [hUSER:NAME ...]
// [*NAME ...] -> try path...
// [SPACE:NAME ...] -> [hSPACE:NAME ...]
// [hSPACE:NAME ...] -> getfact()

function jml(x, opts) {
  if (typeof jml.init === 'undefined')jml_init();
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
  jml.timestamp = jml.f.timestamp(start);

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

      // not built-in/cashed
      if (!fun && !hash.is(f) && f.length!=17) {
	let r = all.replace(
	  /^(.*):/, space=>{
	    if (hash.is(space) && space.length==17)  return space;
	    return `[load-fact ${hash(space)}]`;
	  });
	if (r != all) return r; // come back
      }
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
      if (typeof fun !== 'function')
	console.error('jml:fun not function:', fun);;
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

  // TOOO: make better
  function qqq(s) {
    return s.replace(/\s/g, '+')
      .replace(/"/g, '\\"');
  }

  // TODO: make it take a hash
  jml.f['server']=hSPACE_=>'http://192.168.44.1:8080';
  // [load-get TS N HSPACE]
  //   sends request and register callback
  //   [wait TS 100 3000 get-wait TS N HSPACE]
  // [wait TS MS LEFTMS FUN ARGS]
  //   checks if UUID available, if not,
  //   and not other jml evals, wait MS time.
  //   when data received call:
  //     [FUN ARGS]
  //   if error/timeout call:
  //     [FUN/error-timeout MSG ID FUN ARGS]
  //   which if not exists will call:
  //     [FUN/error CODE MSG ID FUN ARGS]
  //   or, which most likely is bad:
  //     [error FUN/error-timeout CODE MSG ID FUN ARGS]
  jml.f.loadget = (tid, hspace, n)=>`[sendjsonp ${tid} [server]/get?hspace=${hspace}&id=${n}]`;
  // TODO: need quote v
  jml.f.storeput = (tid, hspace, n, ...v)=>`[sendjsonp ${tid} [server]/put?hspace=${hspace}&id=${n}&data=${v.join('+')}]`;

  jml.f.get = (k)=>get(k);
  jml.f.put = (k,...v)=>put(k, v.join(' '));
  jml.f.list = (hspace)=>`[sendjson [timestamp] [server]/list?hspace={hspace}]`;
  
  //jml.f.get = (n)=>`[isendjsonp t0 http://192.168.44.1:8080/get?id=${n}]`;
  //jml.f.put = (n,...v)=>`[isendjsonp t0 http://192.168.44.1:8080/put?id=${n}&data=${qqq(v.join(' '))}]`;
  //jml.f.list = ()=>`[isendjsonp t0 http://192.168.44.1:8080/list?]`;


  // TODO: same/similar function inside ALd/index.html
  // send a request with id TID to URL path WHAT with DATA encoded as query parameters ('?')
  //   TID    typically 'tXXXX...' a unique id
  //   URL    like 'http://yesco.org/'
  //   WHAT   like 'get' or ''
  //   DATA   {a: 45, b:'foo'}
  //   cbOK   optional called when recieved answer
  //   cbFail optional called at error

  //     cb(resptext, resp)
  function isendjsonp(tid, url, what, data, cbOK, cbFail) {
    console.log('isendjsonp: 1');
    isendjsonp[tid] = {
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
    isendjsonp[tid].scriptdom = r;
    console.log('isendjsonp: 2');

    // build url
    let u = new URL(url + what);
    if (data) 
      for (const k in data)
	u.searchParams.append(k, data[k]);

    console.log('isendjsonp: 3', u.href);
    if (!u.searchParams.get('jsonp')) {
      u.searchParams.append('jsonp', 'window.jmlrecvjsonp');
    }
    console.log('isendjsonp: 4', u.href);
    if (!u.searchParams.get('tid')) {
      u.searchParams.append('tid', tid);
    }

    console.log('isendjsonp: 5', u.href);
    // ask for it
    r.src = u.href;
    document.body.appendChild(r);
    console.log('isendjsonp: 6', u.href);
  }
  
  if (typeof window != 'undefined')
    window.jmlrecvjsonp = function recvjsonp(tid, data) {
      let req = isendjsonp[tid];
      console.info(`recvjsonp: ${tid} ${data}`);

      let cbOK = req.cbOK;
      cbOK(data, { status: '200' });

      // TODO: how to detect error?
      // cbFail(data, { status: '404' });

      // cleanup - remove script tag
      let r = req.scriptdom;
      r.parentNode.removeChild(r);
      delete isendjsonp[tid];

      return data;
    };

  function isend(tid, url, what, data, cbOK, cbFail) {
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

    if (tid && !u.searchParams.get('tid')) {
      u.searchParams.append('tid', tid);
    }

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
    return sendinternal(isend, tid, url, fun, ...args);
  }

  jml.f.sendjsonp = function(tid, url, fun, ...args) {
    console.log('sendjsonp: 1');
    let r;
    try {
      r = sendinternal(isendjsonp, tid, url, fun, ...args);
      console.log('sendjsonp: 2');
    } catch (e) {
      console.error('sendjsonp: ', ''+e);
    }
    return r;
  }

  function sendinternal(sender, tid, url, fun, ...args) {
    console.log('sendinternal: 1');
    let ARGS = args.join(' ');
    if (!fun) fun = 'identity';
    console.info(`[send ${tid} ${url} ${fun} ${ARGS}]`);
    console.log('sendinternal: 2');
    sender(tid, url, '', null,
	 (txt,res)=>{
	   console.log('sendinternal: OK');
	   if (txt === null || txt === undefined)
	     fun += '-null';
	   wait_result[tid] = `[${fun} ${ARGS} ${txt}]`;
	   wakeup(tid);
	 },
	 (err,res)=>{
	   console.log('sendinternal: Fail');
	   wait_result[tid] = `[${fun}/error ${ARGS} ${err}]`;
	   wakeup(tid);
	 }
	);
    console.log('sendinternal: 3');
    return `[wait ${tid} 0 0 ${fun} ${ARGS}]`;
  };
  jml.f.wait = function(tid, count, ms, fun, ...args) {
    let r = wait_result[tid];

    // update
    if (r !== null && r !== undefined) {
      wait_result[tid] == '';
      // passing around fun/args is redundant
      // but good for debugging?
      return r;
    }
    
    // wait more again
    let ARGS = args.join(' ');
    count++;
    console.log('TID=', tid);
    let start = timestamp.decode(tid);
    ms = Date.now() - start;
    return `[wait ${tid} ${count} ${ms} ${fun} ${ARGS}]`;
  };
  
  // -- replacation of facts
  jml.f.fact = (id, ...data)=>{
    let hs = id.match(/(.*):/);
    if (hs) {
      if (hash.is(hs))
	hs = hash(hs);
    } else {
      hs = huser;
    }
    let name = id.match(/:(.+)/) || id;
    name = name.replace(/\^.*/, '');
    let params = id.match(/\^.*/) || '';
    if (params) params += ' ';

    data = params + data.join(' ');
    console.log(`fact: hs>${hs}< id>${name}< data>${data}`);
    
    // TODO: this is almost same as in automatic.put (remove that one)
    let tid = jml.timestamp;
    let kt = `${hs} ${name} current timestamp`;
    let ot = iget(kt);
    if (!ot) {
      ot = timestamp(0);
    }
    // - create value as a ledger
    // if it's ever extended, add BEFORE ' - '
    let d = `${ot} ${huser} - ${data}`;
    //   data: hREST nOLDTIMESTAMP hUSER ... - VALUE
    let val = `${hash(d, 8)} ${d}`;
    //    key: hREPL tTIMESTAMP hSPACE NAME
    let kr = `${hREPL} ${tid} ${hs} ${name}`;

    // TODO: put in replication queue
    jml.replQ.push({
      // kv repl store
      key: kr,
      value: val,
      // other
      timestamp: tid,
      hspace: hs,
      name: name,
    });
    return `[ignore FACT ${hs}:${name}]`;
  }      

  // replication
  // TODO: we should eventally be uing
  // websockets, messaging instead
  // https://www.geeksforgeeks.org/web-socket-in-nodejs/?ref=rp

  // -- we're dealing with 3 different states

  jml.replQ = [];
  jml.replLastSeen = '';

  jml.f.updatefacts = (hspace)=>{
    // update locally
    jml.replQ.forEach(e=>{
    });

    // create our update
    let data = [];
    let ts;
    jml.replQ.forEach(e=>{
      ts = e.timestamp;
      // TODO: how about quote spaces?
      let d = e.key + ':::' + e.value;
      data.push(d);
    });

    let json = encodeURIComponent(JSON.stringify(jml.replQ))
	.replace(/[\(\)]/, c=>`%${c.charCodeAt(0).toString(16).padStart(2,0)}`);

    return `[sendjsonp ${ts} [server]/update?last_seen=${jml.replLastSeen}&&data=${json} updatefactsrecv ${ts}]`;
  };

  jml.f.updatefactsrecv = (opthSpace)=>{
    // get updates
    
    // update timestamp as of server
    
    // give some user info
    let names = ['foo', 'bar', 'fie'];
    return `[ignore UPDATEFACTS ${names.join(' ')}]`;
  }

  // -- library
  jml.f.ignore = _=>'';
  jml.f.identity= (...args)=>args.join(' ');
  
  // https://www.movable-type.co.uk/scripts/tea.html
  // © 2000-2005 Chris Veness
  // Extended TEA: this is the 1997 revised version of Needham & Wheeler's algorithm
  // modified (for readabilty) jsk
  // 'password': max 16 chars will be used
  function encrypt(plaintext, password) {
    var v = new Array(2), k = new Array(4), s = "", i;

    plaintext = escape(plaintext);

    // build key
    for (var i=0; i<4; i++) k[i] = Str4ToLong(password.slice(i*4,(i+1)*4));

    for (i=0; i<plaintext.length; i+=8) {
      // encode 64-bits (8 chars)
      v[0] = Str4ToLong(plaintext.slice(i,i+4));
      v[1] = Str4ToLong(plaintext.slice(i+4,i+8));
      code(v, k);
      s += LongToStr4(v[0]) + LongToStr4(v[1]);
    }

    return escCtrlCh(s);
  }

  function decrypt(ciphertext, password) {
    var v = new Array(2), k = new Array(4), s = "", i;

    for (var i=0; i<4; i++) k[i] = Str4ToLong(password.slice(i*4,(i+1)*4));

    ciphertext = unescCtrlCh(ciphertext);
    for (i=0; i<ciphertext.length; i+=8) {
      // decode ciphertext into s in 64-bit (8 char) blocks
      v[0] = Str4ToLong(ciphertext.slice(i,i+4));
      v[1] = Str4ToLong(ciphertext.slice(i+4,i+8));
      decode(v, k);
      s += LongToStr4(v[0]) + LongToStr4(v[1]);
    }

    // strip padded 0s
    s = s.replace(/\0+$/, '');

    return unescape(s);
  }
  
  // v[2] 64-bit value block
  // k[4] 128-bit key
  function code(v, k) {
    var y = v[0], z = v[1];
    var delta = 0x9E3779B9, limit = delta*32, sum = 0;

    while (sum != limit) {
      y += (z<<4 ^ z>>>5)+z ^ sum+k[sum & 3];
      sum += delta;
      z += (y<<4 ^ y>>>5)+y ^ sum+k[sum>>>11 & 3];
      // note: unsigned right-shift '>>>' is used in place of original '>>', due to lack
      // of 'unsigned' type declaration in JavaScript (thanks to Karsten Kraus for this)
    }
    v[0] = y; v[1] = z;
  }

  function decode(v, k) {
    var y = v[0], z = v[1];
    var delta = 0x9E3779B9, sum = delta*32;

    while (sum != 0) {
      z -= (y<<4 ^ y>>>5)+y ^ sum+k[sum>>>11 & 3];
      sum -= delta;
      y -= (z<<4 ^ z>>>5)+z ^ sum+k[sum & 3];
    }
    v[0] = y; v[1] = z;
  }

  // TODO: jsk make Str4ToLong take plaintext, and index as parameter!
  function Str4ToLong(s) {
    var v = 0;
    for (var i=0; i<4; i++) v |= s.charCodeAt(i) << i*8;
    return isNaN(v) ? 0 : v;
  }

  function LongToStr4(v) {
    var s = String.fromCharCode(v & 0xFF, v>>8 & 0xFF, v>>16 & 0xFF, v>>24 & 0xFF);
    return s;
  }

  function escCtrlCh(str) {
    return str.replace(/[\0\t\n\v\f\r\xa0'"!]/g, function(c) { return '!' + c.charCodeAt(0) + '!'; });
  }

  function unescCtrlCh(str) {
    return str.replace(/!\d\d?\d?!/g, function(c) { return String.fromCharCode(c.slice(1,-1)); });
  }
  // END: xtea

  // returns a hash of 16 (or optPrecision) hex chars, prefixed by 'h'
  function hash(s, optPrecision) {
    optPrecision = (optPrecision || 16);
    // we're good to a few millon values.. lol
    // at 4 billion => 40% chance of collision
    // https://www.johndcook.com/blog/2017/01/10/probability-of-secure-hash-collisions/#:~:text=As%20a%20rule%20of%20thumb,or%20about%204%20billion%20items.
    let h = jml.f.encrypt('HASHhash#$@4hsaH', s);
    console.error('H>'+h+'<');
    return 'h' + h.substr(-optPrecision).padStart(optPrecision, '0');;
  }
  hash.is = h=>{
    if (h.length<=4 || h[0]!='h') return false;
    return !!h.match(/^h[0-9A-Za-z]{4,}$/);
  }
  jml.f.hash = (...s)=>hash(s.join(' '));

  // inspiration https://stackoverflow.com/questions/13865302/how-to-convert-a-string-containing-utf8-hex-codes-to-a-javascript-string
  function text2hex(s) {
    return s.replace(/./g, c=>{
      let i = c.charCodeAt(0);
      if (i < 128) return i.toString(16).padStart(2, '0');
      return encodeURIComponent(c);
    }).replace(/%/g, '');
  }
  jml.f.text2hex = (...s)=>text2hex(s.join(' '));
  
  function hex2text(h) {
    return decodeURIComponent(h.replace(/../g, '%$&'));
  }
  jml.f.hex2text = hex2text;
  
  // or symmetric signing with arbitrator
  // bkk! http://spi.unob.cz/papers/2003/2003-18.pdf
  //A New Approach of Signing Documents with Symmetric Cryptosystems and an Arbitrator
  // TODO: public private asymetric encryption
  // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
  // https://cryptojs.gitbook.io/docs/
  // https://crypto.stackexchange.com/questions/5458/should-we-sign-then-encrypt-or-encrypt-then-sign/5466#5466
  jml.f.encrypt = (pass,...txt)=>text2hex(encrypt(txt.join(' '), pass));
  jml.f.decrypt = (pass,txt)=>decrypt(hex2text(txt), pass);
  
  
  jml.f.timestamp = timestamp;
  
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

// cold start
jml();
