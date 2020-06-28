
GOT = r=>r.got;

let gORIC = {
  foo: ['FOO', 'foonum', 'BAR'],
//  foonum: 'foointeger', 
  foonum: ['foointeger'],
  foointeger: /\d+/,
  
  line: ['lineno', 'statements'],
  lineno: ['integer', GOT],
  statements: ['statement',
	       //	       repeat(':', 'statement')],
	      ],
  integer: [/\d+/, r=>+(r.got)],
  repeat(...list) {
    return;
  },
  //statement: alternative('REM', 'END'),
  statement: 'REM',
}

function repeat() {
  return;
}

function alternative() {
  return;
}

// returns rest of LINE after WHAT
function after(what, line) {
  let p = line.indexOf(what);
  return line.substring(p + what.length);
}

function gParse(gram, goal, line, prev, depth) {
  function print(...args) { console.log('  '.repeat(depth*2), ...args); }

  depth = depth || 0;
  print('--->gPARSE:', goal, ' of "'+line+'"', prev);
  let r = gParse_h(gram, goal, line, prev, depth);
  print('<---gPARSE:', goal, '=>', r);
  return r;
}

function gParse_h(gram, goal, rest, prev, depth) {
  function print(...args) { console.log('  '.repeat(depth*2), ...args); }

  rest = rest.trim();
  
  let c = typeof goal === 'string' ?
      gram[goal] : goal;

  // terminator
  if (!c && typeof goal == 'string') {
    print('Terminator', goal);
    if (!rest.startsWith(goal)) return;
    return {
      goal: goal,
      got: goal,
      rest: after(goal, rest),
    }
  }
  
  // follow the rabbit
  if (typeof c === 'string') {
    print('String', c);
    let r = gParse(gram, c, rest, prev, depth+1);
    if (!r) return;
    return  {
      goal: goal,
      got: r,
      rest: r.rest,
      components: {
	[c]: r.got,
      },
      // this looses the depth?
      complist: r.got,
    }
  }

  // function
  if (typeof c === 'function') {
    print('Function', c);
    
    // reduction function
    if (!c.name || c.name === 'GOT')
      return {
	goal: 'REDUCTION',
	got: c(prev),
	rest: rest,
      }

    // grammar function
    let r = c(gram, goal, rest, prev, depth+1);
    if (!r) return;
    return {
      goal: goal,
      got: r,
      rest: r.rest,
      components: {
	[goal]: r.got,
      },
      complist: [r.got],
    }
  }
      
  // regexp
  if (c instanceof RegExp) {
    print('RegExp', c);
    let m = rest.match(c);
    if (!m) return;
    let all = m.shift();
    let r = m.length ? m : all;
    return {
      goal: goal,
      got: r,
      rest: after(all, rest),
      components: {
	[goal]: r,
      },
      complist: [r],
    }
  }

  if (typeof c !== 'object')
    throw `Unknown type, expecting "${goal}" grammar says: ${c}`;

  // sequence
  if (Array.isArray(c)) {
    print('SEQ', c);
    let g;
    let ret = [];
    let rr = {};
    let lastf;
    let complist = [];
    while (g = c.shift()) {
      print('SEQ.component: ', g);
      let r = gParse(gram, g, rest, prev, depth+1);
      if (!r) return;

      ret.push(r);
      rest = r.rest;
      prev = r;
      lastf = g;

      rr[g] = r.components || r.got;
      let cl = r.got;
      if (r.complist) {
	if (cl.length === 1)
	  cl = r.complist[0];
	else 
	  cl = r.complist;
      }
      complist.push([
	g,
	cl,
      ]);
      
      if (0 && typeof g !== 'function') {
	if (r.goal == 'REDUCTION')
	  complist.push([g, rr[g] = r.got]);
	else
	  complist.push([g, rr[g] = r.got]);
      }
    }
    rr.GOAL = goal;

    if (complist.length == 1)
      complist = complist[0];
    
    //if (lastf == GOT)
      return {
	[goal]: prev,
	got: prev.got,
	rest: prev.rest,
	components: rr,
	complist: complist,
      }
    //prev.sequence = ret;
    return prev;
  }

  throw `Unknown type, expecting ${goal} grammar says: ${c}`;
  
}

let util =  require('util');

//r = gParse(gORIC, 'line', '10 REM');
//r = gParse(gORIC, 'foo', 'FOO#42#BAR');
r = gParse(gORIC, 'foo', 'FOO42BAR');

console.log('=='.repeat(20));
console.log(JSON.stringify(r, null, 2));
console.log('--'.repeat(20));

JSON.stringify(r, (k,v)=>{
  if (k == 'components') {
    console.log(v.GOAL);
    console.log('--'+(
      Object.keys(v)
	.filter(n=>n!=='GOAL')
	.map(n=>`${n} = ${v[n]}`)
	.join('\n--')
    )+'\n');
  }
  return v;
});
