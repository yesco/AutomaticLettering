// misc js library
// (c) Jonas S karlsson, jsk@yesco.org

function randHex(len) {
  const bits = 32;
  let h = '';
  while (h.length < len) {
    h += Math.floor((1<<bits)*Math.random()).toString(16).padStart(bits/4, '0');
  }
  return h.substring(0, len);
}

function hardspaces(code) {
  let whitespace = ' \f\n\r\t\v\u00A0\u2028\u2029';
  return code.replace('['+whitespace+']', '\u00A0');
}

function quoteHTML(h) {
  return h.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function flattenstrings(o, optDelim) {
  try {
    return xflattenstrings(o, optDelim);
  } catch(e) {
    alert(e);
  }
}

function xflattenstrings(o, optDelim, seen, deep) {
  optDelim = optDelim || '';
  deep == deep || 0;
  if (!seen) seen = new WeakSet();

  if (o === window) return '#WINDOW#';
  if (o === document) return '#DOCUMENT#';
  if (o === document.body) return '#BODY#';
  if (typeof(o) !== 'object') return '' + o;
  if (o === null || o === undefined) return '';

  // TODO: clearer refs?
  if (seen.has(o)) return '#CIRCULAR#';
  seen.add(o);

  if (Array.isArray(o)) {
    let l = o.map(
      x=>xflattenstrings(x, optDelim, seen, deep+1));
    return l.join(optDelim);
  }
  return Object.keys(o).map(
    k=>`<b>${k}</b>:${xflattenstrings(o[k], optDelim, seen, deep+1)}<br/>`
  ).join(optDelim);
}

// TODO: need to handle circular refs
function pprint(o, klass, depth) {
  try {
    return pprinth(o, klass,depth);
  } catch(e) {
    console.log('pprint.error', e);
  }
}
function pprinth(o, klass, depth) {
  if (!depth) depth = 0
  // these don't work??? wtf?
  switch (typeof(o)) {
  case undefined:
  case null:
  case 'undefined':
  case 'number':
  case 'boolean': return '' + o;
  case 'bigint': return '' + o + 'n';
  case 'string': return quoteHTML(JSON.stringify(o));
  case 'symbol': {
    let s = o.toString();
    let f = Symbol.keyFor(o);
    return ':' + (f === s ? ':' : '') + s;
  }
  case 'function':
    return 'FUNC:' + o.name + '/';
    // TODO: if print props of fun then it get's circular!
    // + o.length + pprintprops(o, klass, depth+1);
  }
  // now assumed to be object

  if (o === null) return '' + o;

  if (Array.isArray(o)) {
    // TODO: make it not print num
    //      let r = pprintprops(o, klass, depth+1);
    let r = '';
    let l = o.length;
    for(let i=0; i<l; i++) {
      r += pprint(o[i], klass, depth+1) + ', ';
    }
    return r;
  }

  // TODO: arguments ... args.callee
  // TODO: date
  // TODO: regexp

  // object
  if (typeof o !== 'object') {
    console.error('ERROR: type of o is ', typeof(o), ' o=' + o);
    return;
  }
  return pprintprops(o, klass, depth+1);
}

function pprintprops(o, klass, depth) {
  // yeah, it's a friggin object!
  if (o === null) return 'null';

  // .prototype  .name == objtype?
  // constructor?
  // Function.getOwnProperties
  // .getProperties()

  /*
    var fooSym = Symbol('foo');
    var myObj = {};
    myObj['foo'] = 'bar';
    myObj[fooSym] = 'baz';
    Object.keys(myObj); // -> [ 'foo' ]
    Object.getOwnPropertyNames(myObj); // -> [ 'foo' ]
    Object.getOwnPropertySymbols(myObj); // -> [ Symbol(foo) ]
    assert(Object.getOwnPropertySymbols(myObj)[0] === fooSym);
    getOwnSymbols
    a  for (let x of o) ???
  */
  
  let op = Object.getOwnPropertyNames(o);
  let ra = [];
  for (let n of op) {
    let ns = n;
    if (!ns.match(/^\w+$/)) ns = quote(ns);
    ra.push(ns + ': ' + pprint(o[n], klass, depth+1));
  }
  return `{${ra.join(', ')}}`;
}

if (0) {
  console.log(pprint(3));
  console.log(pprint('foo'));
  console.log(pprint(3n));
  console.log(pprint(undefined));
  console.log(pprint(function plus(a,b){ return a+b; }));
  console.log(pprint({a: 3, b: 4}));
  console.log(pprint([3, 4]));
}

// A new unique UTC timestamp at millisecond resolution, in 't' + 16 hex chars (17 total)
// Guaranteed to be unique (in this instance),
// and will increase by 1 from last at least,
// meaning it may lay nearby in 'future'.
// Encoded in hex prefixed with a 't'
function timestamp(optT) {
  if (optT === undefined) {
    optT = Date.now();
    // make sure unique (PER USER),
    // (then should add machine id...)
    // if too much data
    // means timestamp is "fake"
    // should we mark it, or add extra
    // digit? considering that most browsers
    // only give in resolution of 20-100ms
    // maybe it's ok...
    if (optT <= timestamp.last)
      optT = ++timestamp.last;
  } else {
    optT = +optT;
  }
  return 't' + optT.toString(16).padStart(16, 0).substr(-16);
}
timestamp.decode = tid=>parseInt(tid.substring(1), 16);
timestamp.is = tid=>tid.length==17 && tid[0]=='t';

// easy access localStorage
function lsput(n, v) {
  try {
    return localStorage.setItem(n, v);
  } catch(e) {
    console.log('lsput: ', e);
  }
}

function lsget(n) {
  try {
    return localStorage.getItem(n);
  } catch(e) {
    console.log('lsput: ', e);
  }
}

function lskeys(a, b) {
  let ls = localStorage;
  let keys = [];
  let prefix = (a && b && a === b);
  for(let i=0; i<ls.length; i++) {
    let k = ls.key(i);
    if (a && k < a) continue;
    if (prefix === true && k.substring(a.length) !== 'a')
      continue;
    else if (b && b >= k) continue;
    keys.push(ls.key(i))
  }
  keys.sort();
  return keys;
}

// regexp search of localStorage
function lssearch(rkey, rdata) {
  let ls = localStorage;
  let keys = [];
  for(let i=0; i<ls.length; i++) {
    let k = ls.key(i);
    if (rkey && !k.match(rkey)) continue;

    let d = ls.getItem(k);
    if (rdata && !d.match(rdata)) continue;

    keys.push(ls.key(i))
  }
  keys.sort();
  return keys;
}

function lsdump(a, b) {
  let ls = localStorage;
  let keys;
  if (typeof(a) == 'object') {
    if (a.constructor.name === 'RegExp')
      keys = lssearch(a, b);
    else if (Array.isArray(a))
      keys = a;
    else
      throw `lsdump: unknown arg type: ${typeof(a)}`;
  } else {
    keys = lslist(a, b);
  }
  keys.forEach(key=>{
    let data = ls.getItem(key);
    r += `${key} : ${data}\n`;
  });

  console.html(r+`</pre>\n${r.length} bytes<br/>`);
}

// DOM browser functions

// dom resolves and return DOM element from name
// it's safe to call many times:
// dom(id) => DOM element
// dom(DOM) => DOM
// dom('notexist') => alert()
//
// if data given, then sets/(pre-apends)
//   the quoted text, or html to the DOM:
//
// dom(idom, data, opt, optStyle)
//   idom resolved to DOM as above
//   data an data, will be appended
//   style is applied on added element
//   opt chars determine function
//     'l' - log (means prepend isotime)
//     'a' - append at end (otherwise replace)
//     'p' - pre-pend (put on top)
//     'h' - assume all values html (no quote)
//      if not html the values will be quoted
function dom(id, optData, opt, optStyle) {
  let d = (typeof id == 'string') ?
      document.getElementById(id) : id;
  if (!d) alert('dom(): no such dom id='+id);
  if (optData === undefined) return d;
  let prefix = '';
  if (dom.log || opt && opt.indexOf('l') >= 0) {
    //prefix += new Date().toISOString();
    // TODO: want ms?
    prefix += new Date().toTimeString().substring(0, 8);
  }
  if (prefix != '') prefix += ': ';
  
  let w = d;
  let append = opt && opt.indexOf('a') >= 0;
  let prepend = opt && opt.indexOf('p') >= 0;
  if (append || prepend) {
    w = document.createElement('div');
    w.style = optStyle;
  } else if (optStyle) {
    w.style = optStyle;
  }

  // TODO: this needs a pretty printer!
  if (opt && opt.indexOf('h') >= 0) {
    // TODO: smaller font?
    if (prefix == '')
      d.appendChild(document.createTextNode(prefix));
    w.innerHTML = flattenstrings(
      [ prefix ? `<b>${prefix}</b><br/>` : '', optData],
      '');
  } else {
    w.innerText = prefix + optData;
  }

  if (prepend)
    d.insertAdjacentElement('afterbegin', w);
  if (append)
    d.appendChild(w);

  return d;
}
// TODO: replace by dom
function domT(id, ...rest){
  let d = dom(id);
  if (rest.length == 0)
    d.innerText = '';
  else if (rest.length == 1)
    d.innerText = '' + rest[0];
  else
    d.innerText = rest.join(' ');
  //	  d.innerText = d.innerText + JSON.stringify(rest);
  // TODO: add better pretty printer
  // especially for special objects
  // like: event, error, dom
}

// inspect a value one level deep
//
// parentval detects one level circular
// exp can be eval to get value v
// how 'j' show JSON
// how 'i' show line value, no deeper
// how 'n' show nulls
//
// This function may return any number
//  of nested [[html, [[html], html]]]
//  lists, use flattenstring!
//
// TODO: make nested objects clickable
function inspect_value(v, how, exp, parentval) {
  how = how || '';
  let printnulls = (how.indexOf('n') >= 0);
  if (how.indexOf('j') >= 0) {
    return quoteHTML(JSON.stringify(v, undefined, '\u00A0\u00A0\u00A0'));
  }
  let t = typeof v;
  if (!t) return;

  if (v === parentval) return '#CIRCULAR#';
  // scalar
  if ('number,string,boolean,bigint,symbol,undefined'.indexOf(t) >= 0)
    return pprint(v);

  // objects
  if (v === null)
    return 'null';

  // investigate object type
  let h = '';
  if (v && v.constructor && v.constructor.name)
    h += `<span class='ptype'>${v.constructor.name}</span>: `;
  else 
    h += `<span class='ptype'>${v}</span>: `;
  
  if (v.id) h += `<span class='plabel'>id="${v.id}"</span>`;

  let denseArray=false;
  if (Array.isArray(v)) {
    let nsetvalues = v.map(_=>1).reduce((a,b)=>a+b, 0);
    let types={};
    v.forEach(x=>{
      let t = typeof(x);
      types[t] = (types[t] || 0) + 1;
    });
    denseArray = (nsetvalues === v.length);
    let ptypes = Object.keys(types).map(t=>`${types[t]} ${t}`).join(', ');
    h += `ARRAY[${v.length}] with ${nsetvalues} values: ${ptypes}`;
  }

  if (t === 'function') {
    let s = v.toString();
    let sig = s.match(/(function |)(\w+\(.*?\))/);
    if (sig && sig[2]) sig = sig[2];
    if (s.match(/\{\s*\[native code\]\s*\}/))
      sig += ' #native# ';
    
    h += `<span class='pfunc'>${sig}</span>`;
  } else {
    if (v.name) h += `<span class='plabel'>name="${v.name}"</span>`;
  }
  
  if (v.value) h += `<span class='plabel'>value="${v.value}"</span>`;

  if (how.indexOf('i') >= 0)
    return h + (Array.isArray(v) ? '[ ... ]' : '{ ... }');
  
  // fall through, it may have properties
  if (!denseArray) {
    return [
      h, '</br>',
      !denseArray && Array.isArray(v) ?
	'<b>Sparse ARRAY!</b><br/>' : '',
      Object.keys(v).map(k=>{
	let o = v[k];
	// TODO: be able to list?
	if (!v.hasOwnProperty(k)) return '';
	if (o === null && !printnulls) return '';

	let s = inspect_value(o, 'i', exp+'['+JSON.stringify(k)+']', v);
	if (!s) s = '' + o;
	if (s.length > 45) {
	  return `<div><span class='pkey'>${k}</span>: <div class='pdata'>${s}</div></div> `;
	} else {
	  return `<span class='pkey'>${k}</span>: <div class='pdata'>${s}</div> `;
	}
      })];
  } 
  // print dense array (first X items)
  if (denseArray && Array.isArray(v)) {
    return [
      h, '</br>',
      v.map((x, i)=>{
	let s = inspect_value(v[i], 'i', exp+'['+i+']', v);
	if (!s) s = '' + x;
	if (s.length > 45)
	  return `<div><span class='pkey'>${i}</span>: <div class='pdata'>${s}</div></div>`;
	else
	  return `<span class='pdata'>${s}</span> `;
      })];
  }
}

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
