// safe quotes a string to make it reatain
// spaces, newlines, be able to send inside 
// filename/html/url messy characters:
// 00-19 \ %&$'"<>=+?\\(){}[]*|/\\: ( > 127)
// (: quoted as used inside lexify output)
// (- not quoted but leading - in filenames may cause problems: prefix with directory (./)
function safeQuote(s) {
  function bangxx(c) {
    let xx = c.charCodeAt(0).toString(16);
    return xx.length==1 ? `!0${xx}` : `!${xx}`;
  }
  
  return s.replace(
    /[\x00-\x19 %&\$'"<=>\?\\\(\)\{\}\[\]\|\/\+\=\*\`\~\!\:\;]/g,
    bangxx);
}

function unQuoteSafe(s) {
  return s.replace(
    /!(..)/g,
    (_, h)=>
      String.fromCharCode(parseInt(h, 16)));
}

// lexify(o) -> s
//
// makes a sortable string from JSON style structure
// this can be directly and correctly sorted
// lexically by unix sort, or any ordered
// key-value store
//
// arrays are collated with maps
// but minimizes size [1,2,3] => (1 2 3)
// sparse arrays becomes only key:value
//
// other datatypes are onverted as follows:
//   n12#99      - [99]
//   n13#100     - notice how it's ascii>[99]
//   sfoo!20bar  - no spaces inside string
//
// ' ' ( ) { } [] are quoted == safe strings
//
// numbers: NaN < -INF < -x < 0 < x < +INF
// lists < numbers < strings
function lexify(v) {
  //console.log(`  lexify: >${v}< ${typeof(v)}`);
  let t = typeof(v);
  if (t === 'object') {
    let keys = Object.keys(v);
    return '(' + keys.map(
      (k,i)=>{
	let n=+k;
	return `${i===n?'':lexify(n?n:k)+':'}${lexify(v[k])}`;
      }).join(' ') + ')';
  }
  if (t === 'string') return 's' + sortable(v);
  if (t === 'number') return 'n' + sortable(v);
  return '' + v;
}
  
// TODO: for more types!
function unsortable_number(s) {
  if (s[0] === '-') {
    s = s.replace(/\d/g, d=>9-d)
  }
  s = s.replace(/^(.*#)/, '');
  s = s.replace('_', '');
  
  console.log('...........', s);
  return +s;
}

// for primitive types return a string represenation that is lexically sortable
function sortable(v) {
  if (v === undefined) return 'U';
  if (v === null) return 'N';
  if (v === '') return 'E';
  
  let t = typeof(v);

  // 'sabc!20def with no space inside
  if (t === 'string')
    return safeQuote(v);

  // TODO: bignums!

  // - numbers (NaN, -INF, ... float/int/1e5 ... +INF)
  if (t === 'number') {
    return num2sortable(v);
    
    function num2sortable(v) {
      if (!Number.isFinite(v)) {
	if (Number.isNaN(v)) return '!NaN';
	if (v === Number.NEGATIVE_INFINITY) return '--INF';
	if (v === Number.POSITIVE_INFINITY) return 'INF';
      }

      if (v < 0) {
	let s = pos2s(-v)
	    .replace(/\d/g, d=>9-d);
	return '-' + s + '_';
      } else
	return pos2s(v);
    }
    
    function pos2s(v) {
      if (v === 0) return '0';
      let s = v.toString();
      let e = s.indexOf('e');
      let p = s.indexOf('.');
      if (e >= 0) {
	e = +s.substring(e+1);
	if (e < 0)
	  return '0' + num2sortable(e) + '#' + v;
	p = e > 0 ? e+1 : e-1;
      } else
	if (p < 0) p = s.length;
      let r = '';
      do {
	p = '' + p;
	r += p;
	p = p.length;
      } while (p > 10);
      return p + r + '#' + s;
    }
  }

  throw new Error('sortable: only take primitives not object of type ' + t);
}

//////////////////////////////////////////////////
// testing if run from node, lol

if (typeof require != 'undefined') {
  let debug_numbers = 0;
  
  function test(l) {
    l.sort(); // sorted in place
    let r = l
	.map(safeQuote)
	.sort()
	.map(unQuoteSafe);
    let ls = l.join('   ');
    let rs = r.join('   ');
    console.log('test.ls ', ls);
    console.log('test.lr ', rs);
    if (ls === rs) {
      console.log('ok!');
    } else {
      console.error('%% NOT EQUAL!');

      for (let i=0; i<l.length; i++) {
	let o = l[i];
	let x = safeQuote(o);
	let u = unQuoteSafe(x);
	
	console.log(`${i}\t>${l[i]}<\t>${r[i]}<\t>${x}<\t>${u}<`);
      }
    }
    console.log();
  }

  let funnychars = '\u0019 %&$\'\"<=>?\\(){}[]|/+=*`~';
  let quoted = safeQuote(funnychars);
  let unquoted = unQuoteSafe(quoted);
  console.log();
  console.log(`funnychars >>${funnychars}<<`)
  ;
  console.log(`    quoted >>${quoted}<<`);
  console.log(`  unquoted >>${unquoted}<<`);
  
  console.log();
  test(funnychars.split(''));

  test(['\n', '\n ', '\n!', ' ', '  ', '   ', ' !', ' ! ', '!', '! ', '!  ', '! !', '! ! ', '!!', '!!!', '!!!!', '"', ' "', ' " ', '" ', ' "', '""', '!"', '"!']);
  test(['a', 'b']);
  test(['b', 'a']);

  let l = [1, 'foo bar', {c: 1, b: 'fie!fum', a:3, 1: 99, 0:42}, 4, [], [[]]];

  l[2][-1]=33;
  l[2][-2]=22;
  l[2][-99]=77;
  l[2][-9]=77;
  l[2][-3]=22;
  console.log('....', l[2]);
  console.log('l=', l);
  console.log('sortable=', sortable(l));
  console.log('ordered=', sortableOrdered(l));
  console.log('l.lexify=', lexify(l));

  // debug number
  if (debug_numbers) {
    let sparse = Array(20);
    sparse[13] = 'thirteen'
    sparse[19] = 19;
    console.log('sparse.lexify=', lexify(sparse));
    
    let aprops = [1,2,3];
    aprops['foo'] = 'bar:fie:fum';
    console.log('aprops.lexify=', lexify(aprops));

    let nums = [0,0.0001,0.1,0.11,0.9,1,2,2.1,2.2,3,9,10,11,20,99,100,101,200,1000,2000,1e4,1e9,1e42,1e123,1/0,];
    nums = nums.concat([0,0.1,0.01,1e-42,1e-123,3e-123,2e-124,1,2,10,1e3,1e9,1e42,2e42,2.1e42,1e123,3e123]);

    nums.unshift(NaN);

    console.log('nums', nums);
    nums = Array.from(nums).reverse().map(n=>-n).concat(nums);
    console.log('nums w minus', nums);

    nums.sort((a,b)=>a-b);

    nums.forEach(
      n=>console.log(`${n}\t${sortable(n)}`)
    );

    // we prefer NaN < -Inf js: undefined
    nums = nums.filter(n=>Number.isFinite(n));

    let snums = nums.map(sortable);
    let sno = Array.from(snums).sort();

    let snou = sno.map(unsortable);

    for(let i=0; i<nums.length; i++)
      console.log(i, nums[i], snums[i], sno[i], snou[i]);
  }
}
