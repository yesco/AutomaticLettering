// ORiC-style parse (next) expression
//   "lax" style ala PRINT
//
// PRINT lax method.
// Returns [exp, rest]

// returns next parse pos
// meaning first exp is TILL (< pos)

function parseExp(line) {
  let i = 0, c = '';
  function xspc() {
    i++;
    if (i >= line.length) return;
    c = line[i];

    // skip space
    while (c === ' ') c = line[++i];

    // at end
    if (c === undefined) return;

    return true;
  }
  function skip(x) {
    let rest = line.substring(i)
    if (typeof x === 'string') {
      if (rest.startsWith(x))
	i += x.length;
      return true;
    }
    // regexp
    let m = rest.match(x);
    if (!m) return true;
    //console.log('-----regexp:', x, m[0], m[0].length);
    i += m[0].length;
    return true;
  }
  function got(x) {
    let before = i;
    skip(x);
    return i > before;
  }

  // each function "return;" when can't go on
  function exp() {
    if (dec()) return op();
    if (num()) return op();
    if (got('-')) return exp()
    if (got('+')) return exp();
    if (got(/^[;,]/)) return;
    if (got(/^"[^"]*"/)) return concat();
    if (got(/^".*/)) return;
    if (got(/^[A-Z]/)) return varr() && op();
    return par();
  }
  // .\d* O( e )
  function dec() {
    if (got(/^\.\d*/)) {
      skip(/^E\d*/);
      return true;
    }
  }
  // \d+ O( A( dec e ) )
  function num() {
    if (got(/^\d+/)) {
      dec() || skip(/^E\d*/);
      return true;
    }
  }
  // ([-+*/=]|<=?|>=?|<>) exp
  function op() {
    if (got(/^[\+\-\*\/=]/))
      return exp();

    // <= <> >=
    if (got('<')) {
      skip(/^[=>]/);
      return exp();
    }
    if (got('>')) {
      skip('=');
      return exp();
    }
  }
  // '+' exp
  function concat() {
    if (got('+')) return exp();
  }
  // '(' exp ')'
  function par() {
    if (got('('))
      return exp() && got(')') && op();
  }
  // [A-Z] [A-Z\d]* [%\$] index 
  function varr() {
    skip(/^[A-Z\d]*/);
    skip(/^[\$\%]/);
    index(); // optional array indexing
    return true;
  }
  // '(' exp R(exp ',') ')'
  function index() {
    if (got('(')) {
      while (exp()) {
	if (!got(',')) break;
      }
      return got(')');

    }
  }
  
  let r = exp();
  return [
    line.substring(0, i),
    line.substring(i),
    i,
    r,
  ];
}

// in nodejs - run tests!
if (typeof required !== undefined) {
  function test(line, xpt) {
    console.log('\n==== ' + line);
    let ra = [];
    let rr = [];
    let r;
    let s = line;
    while (s) {
      r = parseExp(s);
      ra.push(r);
      //console.log('-----', r);
      rr.push(r[0]);
      s = r[1]
    }
    console.log(':', rr);
    //console.log('GOT:', rr[0]);
    if (rr[0] === xpt) {
      //console.log('OK!');
    } else {
      console.log('EXP:', xpt);
      console.log('RES:', ra[0]);
      console.error('?-------------------------WRONG!');
    }
  }
  test('', '');
  test('.', '.');
  test('3', '3');
  test('33', '33');
  test('33.', '33.');
  test('33.A', '33.');
  test('..', '.');

  // strings
  test('""', '""');
  test('"FOO"', '"FOO"');
  test('"FOO', '"FOO'); // haha till EOL
  test('"FOO"3', '"FOO"'); // haha till EOL  
  test('3"FOO"', '3'); // haha till EOL  

  // ops
  test('+3', '+3');
  test('+"FOO"', '+"FOO"');

  // paren
  test('("FOO', '("FOO'); // it's not saying it correct...
  test('(FOO', '(FOO'); // it's not saying it correct...

  test('35,FOO', '35'); // it's not saying it correct...
  test(',FOO', ','); // it's not saying it correct...
}
