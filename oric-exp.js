// ORiC-style parse (next) expression
//   "lax" style ala PRINT
//
// PRINT lax method.
// Returns [exp, rest]

// returns next parse pos
// meaning first exp is TILL (< pos)

// keywordz is a concat string:
// ',FOO,BAR,FIE,FUM,'
function parseExp(line, keywordz) {
  let i = 0, c = '';

  let res = [], rev = [], tok = [];
  let acc = '';
  function out(add, end) {
    if (add) res.push(add);
    if (end) rev.push(end);
    if (acc) {
      tok.push(acc.trim());
      acc = '';
    }
    return true;
  }
  function o(r) {
    out();
    return r;
  }
  function ogot(x) {
    return o(got(x));
  }

  function skip(x) {
    let rest = line.substring(i)

    if (typeof x === 'string') {
      if (rest.startsWith(x)) {
	i += x.length;
	acc += rest.substring(0, x.length);
	console.log('-------ACC:',acc);
      }
      return true;
    }

    // regexp
    let m = rest.match(x);
    if (!m) return true;
    //console.log('-----regexp:', x, m[0], m[0].length);
    i += m[0].length;
    acc += rest.substring(0, m[0].length);
    console.log('-------ACC:',acc);
    return true;
  }
  function got(x) {
    let before = i;
    skip(x);
    return i > before;
  }

  // each function "return;" when can't go on
  function exp() {
    while(got(' '));
    if (dec()) return op();
    if (num()) return op();
    if (hex()) return op();
    if (ogot('-')) return exp()
    if (ogot('+')) return exp();
    if (ogot(/^[;,]/)) return;
    if (ogot(/^"[^"]*"/)) return concat();
    if (ogot(/^".*/)) return;
    if (got(/^[A-Z]/)) return varr() && op();
    return par();
  }
  // .\d* O( e )
  function dec() {
    if (got(/^\.\d*/)) {
      skip(/^E\d*/);
      out([acc]);
      return true;
    }
  }
  // \d+ O( A( dec e ) )
  function num() {
    if (got(/^\d+/)) {
      dec() || skip(/^E\d*/);
      out([acc]);
      return true;
    }
  }
  function hex() {
    if (got('#'))
      return ogot(/^[A-Z]*/);
  }

  // ([-+*/=]|<=?|>=?|<>) exp
  function op() {
    if (got(/^[\+\-\*\/=]/)) {
      out([acc]);
      return exp();
    }

    // <= <> >=
    if (got('<')) {
      skip(/^[=>]/);
      out([acc]);
      return exp();
    }
    if (got('>')) {
      skip('=');
      out([acc]);
      return exp();
    }
  }
  // '+' exp
  function concat() {
    if (got('+')) return exp();
  }
  // '(' exp ')'
  function par() {
    if (ogot('(')) {
      out(['('], [')']);
      let before = i;
      let r = o(exp());
      ogot(')');
      return op();
    }
  }
  // [A-Z] [A-Z\d]* [%\$] index 
  function varr() {
    skip(/^[A-Z\d]*/);
    skip(/^[\$\%]/);
    index(); // optional array indexing
    out();
    return true;
  }
  // '(' exp R(exp ',') ')'
  function index() {
    if (ogot('(')) {
      while (o(exp())) {
	if (!ogot(',')) break;
      }
      return ogot(')');

    }
  }
  
  let r = exp();
  let x =[
    line.substring(0, i).trim(),
    line.substring(i).trim(),
    i,
  ];
  x.res = res;
  x.rev = rev;
  x.tok = tok;
  return x;
}

// in nodejs - run tests!
if (typeof required !== undefined) {
  function test(line, xpt) {
    console.log('\n========================================');
    console.log('\n==== ' + line);
    let ra = [];
    let rr = [];
    let r;
    let s = line;
    while (s) {
      r = parseExp(s);
      ra.push(r);
      if  (r[0] == '') {
	console.log('--?SYNTAX---', r);
	break;
      }
      console.log(r);
      console.log('x.RES', r.res);
      console.log('x.REV', r.rev);
      console.log('x.TOK', r.tok);

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

  test('#FFFFF', '#FFFFFF');
  test('##', '#');
  test('3##', '3');
  test('3+#', '3');

  test('3+5*3*(7+2*4-333/(4+5))', '3');
  test('1 2 3', '123');

  
  // PRINT "FOO"BAR"
  // PRINT "4*3="; 4*3
  // PRINT "FOO";"BAR" => FOOBAR
  // ?35 == PRINT 35
  // PRINT 1;2 => <spc>1<spc><spc>2<spc>
  // 40 PRINT"THE CODE FOR "A$"="ASC(A$)
  // PRINT "foo",
  // PRINT "bar"    > fooo       bar 
  // 20 PRINT @X,10;·• WHIZZ2" 
  // TEST: PRINT 1 2 3+6 =>  123  6
  // TEST: PRINT 1 2 3, 4 5, FOO, FOO& =>
  //   123     45   3
  //   ?SYNTAX ERROR
  // TEST: LET A=1 2 3 : PRINT A => 123
  // TEST: A=77 : AA=6 : A$="FOO"
  //   TEST: PRINT A A => 6
  //   TEST: PRINT 7A => 7  77
  //   TEST: PRINT 9AA4 5, 99 => 9  6   99
  //   TEST: PRINT 3A$6 =>  3 FOO 6
  //   PRINT 3A$77AA(3)5A$A =>
  //     3 FOO 77 0 5 FOO 77
  //   ?A$7A$AA => FOO 7 FOO 6
  //   ?A$3+4*10^2A => FOO 403  77
  //   PRINT A A => 6
  //   PRINT AA => 6
  //   PRINT A => 77
  //   ? A A+7 => 13
  // TEST: LET A B = 7 5
  //   PRINT AB =>  75
  //   PRINT AB 5 =>  75
  //   PRINT AB C => 75
  // TODO: PRINTAT
  //  20 PRINT @X,10;·• WHIZZ2"

  test('(3+4)', '(3+$)');

}

function tokenizer(line, keywordz='') {
  let rkeywordz = keywordz.split(/,/).filter(k=>k.length).join('|');
  rkeywordz = RegExp('^('+rkeywordz+')');

  let i = -1, c = '', t = '';
  function spc() {
    while (c == ' ' && skip());
    return true; // always...
  }
  function skip() {
    i++;
    c = line[i];
    return !!c;
  }
  function step() {
    if (c) t += c;
    //console.log('STEP:', c);
    skip();
    c = line[i];
    return !!c;
  }
  // true if next is keyword
  function nextiskeyword() {
    let m = line.substring(i).match(rkeywordz);
    return m && m[0];
  }
  function keyword() {
    let kw = nextiskeyword();
    if (!kw) return;
    i += kw.length;
    t = kw;
    c = line[i];
    return true;
  }
  let ret = [];
  function emit(typ) {
    if (t) {
      ret.push([typ, t]);
      t = '';
      return true;
    }
  }
  function r(re) {
    spc();
    if (c && c.match(re)) {
      step();
      return true;
    }
  }
  function ch(cc) {
    spc();
    if (cc == c) {
      step();
      return true;
    }
  }

  function letter() {
    if (nextiskeyword()) return;
    return r(/[A-Z]/);
  }
  function digit() {
    return r(/\d/);
  }
  function op() {
    return r(/[=\+\-\/\*+]/);
  }
  
  function token() {
    if (ch('#')) {
      while(digit() || r(/[A-F]/));
      return emit('hex');
    } else if (ch('"')) {
      while(step() && c != '"');
      ch('"');
      return  emit('string');
    } else if (digit()) {
      while(digit());
      return emit('number');
    } else if (op()) {
      return emit('op');
    } else if (keyword()) {
      return emit('keyword');
    } else if (letter()) {
      do {
	spc();
      } while(letter() || digit());
      r(/[\%\$]/);
      return emit('name');
    } else {
      step();
      return emit('');
    }
  }
  
  //console.log('--TOKENS-------LINE:', line);
  skip();
  while(token());
  return ret;
}

function parse(line) {
  let tokens = tokenizer(line);
  let r = [];

  let c, t, s;
  let was;
  function skip() {
    c = tokens.shift();
    if (c) {
      wasa = t;
      was = s;
      t = c[0];
      s = c[1];
    }
    if (c) return true;
  }
  function have(es) {
    if (s === es) return skip();
  }
  function isa(et) {
    if (t === et) return skip();
  }
  function geta(et) {
    if (t === et) {
      skip();
      return was;
    }
  }

  // function, operator, parameter, instruction
  function xyzstatement() {
    if (have("'")) return pQuote();
    if (isa('keyword')) {
      switch(s) {
      case 'REM': return pREM();
      case 'IF': return pIF();
      //case 'THEN': 
      //case 'ELSE': return;
      case 'REPEAT': return ()=>push();
      case 'UNTIL': return pUNTIL();
      case 'FOR': return pFOR();
      //case 'TO': break;
      //case 'STEP': break;
      case 'NEXT': return pNEXT();
      case 'ON': return pON();
      case 'GO': throw 'What? "GO"';
      case 'DEF': return pDEF();
      case 'DIM': return pDIM();
      case '!': return PBANG();
      case 'GET': return pGET();
      case 'INPUT': return pINPUT();
      case 'LET': return pLET();
      case 'LLIST':
      case 'LIST': {
	let cmd = was;
	let start = geta('number');
	expect('-');
	let end = geta('number');
	let match = geta('string');
	return ()=>LIST(start, end, match, cmd); }

// normal instruction, just generate a call
      default: return ()=>window[was].call(was, pArgs);
      }
    }
    throw 'Unexpected token: ' + s + ' of type ' + t;;
  }
  function statements() {
  }
  function pUnaryOp(num) {
  }
  function pOp(num) {
  }
  function pSOp(str) {
  }
  function pLET(was) {
  }
  function pExp() {
    if (isa('op')) return ()=>pUnaryOp(was);
    if (isa('number')) return ()=>pOp(was);
    if (isa('string')) return ()=>pSOp(was) || pLET(was);
  }
}


console.log("\n\n");
console.log("---------------------------");
console.log(tokenizer('   (   3    3+4 55 5 )   '));
console.log(tokenizer(' 3A$B(55)" f o   ob  ar3+5 "9'));
console.log(tokenizer(' 3A"fish'));
console.log(tokenizer('PRINT 3', ',PRINT,'));
console.log(tokenizer('PRINT 3+4', ',PRINT,'));


  // returns a miniparser object
  function parser(line) {
    let tokens = tokenizer(line, ',LIST,LLIST,');
    let r = [];

    let c, t, s;
    let was = '', wasa = '';

    let p = {
      type() { return t },
      val() { return s },

      next() {
	c = tokens.shift();
	wasa = t;
	was = s;
	t = c && c[0];
	s = c && c[1];
	if (c) return true;
      },
      skip(es) {
	if (s === es) {
	  p.next();
	  return was;
	}
      },
      get(et) {
	if (t === et) {
	  p.next();
	  return was;
	}
      },
      getnum(alt) {
	let n = p.get('number');
	return (n === undefined) ? alt :
	  +n;
      },
      getstr(alt) {
	let s = p.get('string');
	return (s === undefined) ? alt :
	  (s.match(/^"(.*)"$/) || ['',alt])[1];
      }
    };

    p.skip();
    return p;
  }

  function LIST() {
    // DOC: List program lines
    // LIST 10 | 10- | -10 | 10-20
    // New: LIST "PRINT" - matches!

    // shouild be passed in as arg, or this?
    let p = parser(this);

    let printer = p.skip('LLIST');
    if (!printer && !p.skip('LIST')) return;

    let start = p.getnum(0);
    let end = (p.skip('-') ?
	       p.getnum(0) : start)
	|| 65536;
    p.skip(',');
    let match = p.getstr('');

    console.log({this: this, start, end, match, printer});
  }

console.log("--------------------------------------------------------------------------------------------------------------");

LIST.call('LIST');
LIST.call('LIST 10');
LIST.call('LIST 10-');
LIST.call('LIST 10-30');
LIST.call('LIST -30');
LIST.call('LIST "A"');
LIST.call('LIST 10- "A"');
LIST.call('LLIST 42 "A"');
LIST.call('LLIST 42 \'A\'');
LIST.call('LLIST 42 "A\'BC\'"');


console.log(tokenizer('IF I THEN 3 ELSE 4', ',IF,THEN,ELSE,'));

console.log(tokenizer('IFITHENPRINT33ELSE4', ',IF,THEN,ELSE,PRINT,'));



