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
    /[\x00-\x19 %&\$'"<=>\?\\\(\)\{\}\[\]\|\/\+\=\*\`\~\!]/g,
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

let l = [1, 'foo bar', {c: 1, b: 'fie!fum', a:3}, 4];
console.log(l);
console.log(sortable(l));
console.log(sortableOrdered(l));

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
    let r = {};
    let keys = [...Object.keys(v)];
    if (doSortKeys) keys.sort();
    keys.forEach(k=>{r[k]=rec(v[k])});
    return r;
  }
  
  return v;
  
  // node is 
  return new Map(Array.from(
    v.entries(),
    ([k, v])=>
      [k, rec(v)] ));
  

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
