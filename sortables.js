// safe quotes a string to make it reatain
// spaces, newlines, be able to send inside 
// filename/html/url messy characters:
// 00-19 \ %&$'"<>=+?\\(){}[]*|/\\ > 127
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

// testing if run from node, lol
if (typeof require != 'undefined') {
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
}

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
if (0) {
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
  console.log(`  lexify: >${v}< ${typeof(v)}`);
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
  function unsortable(s) {
    if (s[0] === '-') {
      s = s.replace(/\d/g, d=>9-d)
    }
    s = s.replace(/^(.*#)/, '');
    s = s.replace('_', '');
    
    console.log('...........', s);
    return +s;
  }


// The idea was to give he result of this to
// JSON.lexify but it's not handling keys
// the right well and too much quotes
// use and rename lexify instead
//
// TODO: simplify and handle only simple values
function sortable(v) {
  return sortable_internal(v, sortable, false);
}

function sortableOrdered(v) {
  return sortable_internal(v, sortableOrdered, 'doSortKeys');
}

// don't call direct, and we can't have optional flags
// because when passed to .map() etc it gets extra parameters!
function sortable_internal(v, rec, doSortKeys) {
  if (v === undefined) return 'U';
  if (v === null) return 'N';
  if (v === '') return 'E';
  
  let t = typeof(v);

  // 'sabc!20def with no space inside
  if (t === 'string')
    return safeQuote(v);

  // - array (nestable)
  if (Array.isArray(v))
    return v.map(rec);

  if (t === 'object') {
    if (doSortKeys) {
      let r = {};
      for (let k in v) {
	r[k] = v[k];
      }
      return r;
    }

    let r = {};
    let keys = [...Object.keys(v)];
    if (doSortKeys) keys.sort();
    keys.forEach(k=>{r[k]=rec(v[k])});
    return r;
  }
  
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

  // TODO: bignums!

  // - numbers, bignums, floats
    // - assocs (hash but w sorted keys)
    //   {sfie : 003 sfoo : 005 sfum : sbar}

    // - numbers
    // encode as exponential decimal
    // w fractions
    
    // useful characters
    // \ !$#%&*-./0-9:;<=>?@A-Z^_a-z|~

    // - strings (no space inside)
    //   sfoo sbar = 'foo' 'bar'

    //   'foo\nbar'	next line
    //   'foo\rbar'	<---
    //   sfoo!bar
    //   'foo bar'
    //   sfoo%20bar     doesn't sort right
    //   sfoo!bar	after ' ' is '!'
    //   sfoo!bar	after ' ' is '!'
    //   'foo!bar
    //   sfoo!1bar	or
    //   sfoo!%21ar
    //   'foo%bar
    //   'foo&bar
    //   'foobar

    //   ' '	=> s!
    //   '  '	=> s!!
    //   ' !'	=> s!!1
    //   ' ! '	=> s!!1
    //   '!'	=> s!1
    //   '! '	=> s!1!
    //   '!  '  => s!1!!
    //

    // positive
    // . 7 87 #          1e-12
    // . 8 1  # 2        2e-8
    // . 8 2  # 5        5e-7
    // . 8 2  # 2        2e-7
    // . 8 2  # 1        1e-7
    // 0
    // 1 # 1
    // 1 # 2
    // 1 # 3
    // 1 # 9
    // 2 # 10
    // 2 # 99
    // 3 # 1 [00]
    // 3 # 100
    // 3 # 101
    // 9 # 123456789
    // NONONO! 10 # 1234567890
    // 10 # 1234567890
    // ..
    // 099
    // 1  3 # 1  	100 (same)
    // 1  3 # 100	100 (same)
    // 1  3 # 101	101
    // 1  7 # 1		1e7
    // 2 12 # 1[.333535...] 1e12
    // 2 12 # 123456789012[.3535353...]
    // 2 10 1...90 # 7  7e1...

    // negative
    // !		-1e-7
    // !		-2000
    // !		-1000
    // ! 8 6 # 698	-301
    // ! 8 6 # 699	-300
    //   1 3 # 3	-300
    // ! 8 6 # 700	-299
    //   1 3 # 299
    // ! 8 6 # 7	-200
    // ! 8 6 # 8	-100
    //   1 3 # 1	+100
    // 			-20
    // 			-10
    // 			-2
    // 			-1
    // 
    // !996		-3
    // !997		-2		
    // !998		-1

  if (v === 'function')
    throw new Error("%% sortable: can't convert function!");
}
