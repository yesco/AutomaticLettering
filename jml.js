function jml(x, opts) {
  if (opts) {
    // can't be let ;)
    var oPass = opts.match(/pass/);
    var oStep = opts.match(/step/);
    var oTrace = opts.match(/trace/);
  }

  if (typeof jml.init === 'undefined')jml_init();
  if (typeof x === undefined) return;
  if (typeof x !== 'string') x = '' + x;
    
  let regexp = oStep ?
      /\[([^\[\]]*?)\s*\]/ :
      /\[([^\[\]]*?)\s*\]/g ;
  let n = 1, p = 0, t = 0;
  while (n > 0) {
    p++;
    n = 0;
    x = x.replace(regexp, function(all, inside) {
      n++;
      let args = inside.split(/\s+/g);
      let f = args.shift();
      let fun = jml.f[f];
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

  // system
  jml.f.error = function(f, ...args) {
//    console.error('jml.ERROR: no such function: ', f, ' args=', args);
    return '<%%ERROR:' + f + ' ' + args + '%%>';
  };

}
