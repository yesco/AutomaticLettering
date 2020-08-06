//          eXchange ORIC - xoric.js
//
// (C) 2020 Jonas S Karlsson (jsk@yesco.org)
//
//    file and format converter for ORIC

// formats:
//  (input/ouput)
//    raw = byte array
//    hex = hexify bytes in
//    b64 = base64 encoding
//    txt = string (utf-8!)
//    bas = string (utf-8!)
//    bac = ORIC BASIC tokenized
//    tap = ORIC .tap (archieve)
//    fil = fil(e) object (as below)
//  (specific for output)
//    dir = [fil, ...]
//    new = create new files (from tap)
//    num = string (utf-8!) (will number lines)
//    unm = string (utf-8!) (will number lines)
// 
//    dsk = not supported (don't have one)
//
// fil(e) object (from ouput: 'dir')
//   {
//     name : 'FOOBAR.SCR',
//     type : 0x80
//     (stype: 'basic' | 'data' | ''),
//     run  : 0x
//     (srun : 'run' | 'call' | ''),
//     A    : 0x501,
//     E    : 0x509,
//     data : <array of bytes>, // one byte extra!
//   }
//     
//
// browsers have atob/btoa, nodejs doesn't have it
if (typeof atob === 'undefined') {
  atob = function(s) {
    return Buffer.from(s, 'binary').toString('base64');
  }
}
if (typeof btoa === 'undefined') {
  btoa = function(b) {
    return Buffer.from(b, 'base64').toString('binary');
  }
}
    
function arr2asc(a) {
  let t = '';
  for(let i=0; i<a.length; i++)
    t += String.fromCharCode(a[i]);
  return t;
}

function asc2arr(s) {
  let a = new Uint8Array(s.length);
  for(let i=0; i<s.length; i++)
    a[i] = s.charCodeAt(i);
  return a;
}

// parse a single byte array (data)
// from format, to format, spec: fil
// => [fil, ...]
// (a tap file can give several!)
function xoric(from, to='txt', data, fil) {
  if (data == undefined) return;

  function niy() {
    throw new Error('not implemented');
  }

  function expect(typ) {
    if (typeof data !== typ) {
      if (typ === 'Array' && !Array.isArray(data))
	throw new Error('xoric: input type mismatch, got ' + typeof data + ', expected ' + typ + ' constructor='+(typeof data==='object'?data.constRUCTOR.name:''));
    }
  }

  let files;

  if (typeof data === 'string')
    data = asc2arr(data);

  // normalize from-format => byte array
  switch(from) {
  case 'raw': break;
  case 'bas': break;
  case 'txt': break;
  case 'bac': 
    data = decodeBasic(data);
    break;
  case 'hex': 
    data = arr2asc(data).match(/.{1,2}/g).map(
      xx=>parseInt(xx, 16));
    break;
  case 'b64':
    data = btoa(arr2asc(data));
    break;
  case 'tap':
    files = decodeTap(data);
    break;
  default: throw new Error('xoric: unknow from-format: ' + from);
  }

  if (xoric.verbose > 2)
    console.error('FROM: ', data);

  data = new Uint8Array(data);
  // update converted data
  fil.data = data;

  if (xoric.verbose > 2)
    console.error('FROM.arr: ', data);

  // if asking for json/dir
  if (to === 'dir') return files;
  
  // process all files
  if (!files || !files.length)
    files = [fil];
    
  files.forEach(fil=>{
    fil.outdata = convertTo(fil, to);
  });
  return files;
}
// globals/static for package, hang on function!
xoric.verbose = 1;
xoric.numStart = 1000;
xoric.numStep = 10;

function convertTo(fil, to) {
  let data = fil.data;
  // saved byte array to following format
  switch(to) {
  case 'new':
  case 'raw': return data;
  case 'hex': return data.map(b=>b.toString(16).padStart(2, '0')).join('');
  case 'b64': return atob(data);
  case 'num': 
    data = ('\n' + arr2asc(data)).replace(
      /\n/g, (a,i)=>
	(i?'\n':'') + ' ' +
	(i<data.length ?
	 xoric.numStart + i * xoric.numStep
	 : '') );
    return data;
  case 'bas': 
    data = decodeBasic(data);
    // fall through
  case 'txt': return arr2asc(data);
  case 'unm': // UNuMber text line
    data = arr2asc(data).replace(
      /(^\d+|\n\d+\s{0,1})/g, '\n');
    return data;
  case 'bac':
    data = encodeBasic(data);
  case 'tap': return encodeTap(fil);
  case 'u8a': return new Uint8Array(data);
  case 'dir': return files;
  default: throw new Error('xoric: unknow to-format: ' + to);
  }
}

function decodeBasic(data) {
  let r = [];
  // start at -1, pretent it's a \0 !
  for(let i=-1; i<data.length; i++) {
    let b = data[i];
    if (b === 0 || i === -1) {
      if (b === 0) {
	// -- end of statement \0 => \n
	r.push(10);
      }
      i++;

      // -- 2 byte next pointer
      // TODO: check for consistency
      let addr = data[i] + (data[i+1]<<8);
      i += 2;

      
      // EOF lines
      if (!addr) {
	if (i !== data.length) {
	  if (xoric.verbose) {
	    let remain = data.length-i;
	    console.error('xoric.decodeBasic: basic programm ends at '+i+' but '+remain+' bytes reamaining, out of '+data.length);
	    if (remain===1)
	      console.error('(1 extra byte ignored - known ORIC-CSAVE bug saves one extra!');
	    else
	      console.error("(this may mean that there is machine code data hidden/stored that isn't visible)");
	  }
	}
	// finish with what we have
	break;
      }
      // -- 2 byte line number, ' '
      let lno = data[i] + (data[i+1]<<8);
      i += 2;
      r.push(...Array.from(asc2arr(''+lno+' ')));

      // we're now stadning at next already
      i--; // compensate 
      continue;
    } else if (b > 127) {
      // keyhwords, if hi-bit set
      let kw = OricKeywords.code2name[b];
      try {
	r.push(...Array.from(asc2arr(kw)));
      } catch(e) {
	if (verbose)
	  console.error('decodeBasic: ----- unexpected error? [@'+i+': '+b+' => '+kw+']\n');
      }
    } else {
      // normal ascii
      // TOOD: if <32 ... ? (may be allowed)
      // (or indicate decoding failure...)
      r.push(b);
    }
  }
  return r;
}

// his will make a memory correct binary
// instance to be located at #50A with
// pointers and 2 byte encoded line-nubmers
function encodeBasic(data, addr=0x50a) {
  let r = [];
  // create stgring to match keywords
  // (highly ineffcient but speedy!)
  let txt = arr2asc(data);
  // start at -1, pretent it's a \0 !
  for(let i=-1; i<data.length; i++) {
    let b = data[i];
    if (b === 0 || i === -1) {
      if (b === 0) {
	// -- end of statement \0 => \n
	r.push(10);
      }
      i++;

      // -- 2 byte next pointer
      // TODO: check for consistency
      i += 2;

      // -- 2 byte line number, ' '
      let lno = data[i] + (data[i+1]<<8);
      i += 2;
      r.push(...Array.from(asc2arr(''+lno+' ')));

      // we're now stadning at next already
      i--; // compensate 
      continue;
    }

    let s = txt.substring(i, 20);
    let m = s.match(rkeywordz);
    if (m) {
      let kw = m[0];
      console.log('KEYWORD: ', kw);
    } else {
      // normal ascii
      // TOOD: if <32 ... ? (may be allowed)
      // (or indicate decoding failure...)
      r.push(b);
    }
  }
  return r;
}

// returns an untyped array of 'bytes'
// (simplier to .concat()!)
function encodeTap(fil) {
  let A = fil.A || 0x501;
  let hiA = A >> 8;
  let loA = A & 0xff;

  if (xoric.verbose > 1)
    console.error('encodeTap.length: ', fil.data.length);
  if (xoric.verbose > 2)
    console.error('encodeTap.data: ', fil.data);
  let E = fil.E || A + fil.data.length - 1;
  let hiE = E >> 8;
  let loE = E & 0xff;

  // warn if name longer
  // (ORIC will handle it, just ignore up to \0!)
  if (fil.name.length > 16)
    console.error('encodeTap.name more than 16 chars! "', fil.name, '"');

  let bytes = [
    0x16, 0x16, 0x16, 0x16, // head sync
    0x24, // head end
    0xff, 0xff, // reserved1
    fil.type,
    fil.run,
    hiE, loE,
    hiA, loA,
    0x00, // reserved2
  ]
      .concat(Array.from(asc2arr(fil.name)))
      .concat([0]) // zero-terminated name
      .concat(Array.from(fil.data));
  if (xoric.verbose)
    console.error('TAP fil.name: ', fil.name);
  // TODO: should we add extra byte???

  return new Uint8Array(bytes);
}

function decodeTap(data) {
  let files = [];
  let pos = -1, fil;
  while (([fil, pos] = parseFromTap(data, pos)) && fil) {
    files.push(fil);
  }
  if (xoric.verbose > 1) {
    console.error('xoric.decodeTap.pos:', pos);
    console.error('xoric.decodeTap.files:', files);
  }
  return files;
}

// extracts one file starting at pos
// ==> [fil, lastpos] 
//  || [undefined, undefined] if no more!
//
// call again with lastpos to get next!
//
// (notice: pos starts at -1, default)
// currently, throws error at error
// TODO: return [undefined, 'error'] instead?
function parseFromTap(bytes, pos=-1) {
  let startpos = pos;

  if (pos+1 >= bytes.length) {
    if (xoric.verbose > 2) console.error('TAP.eof');
    return [undefined, undefined];
  }

  // parse header
  // (expect at least 1 0x16 + 1 0x24)
  let header = 0;
  while (1) {
    let b = bytes[++pos];
    if (b === undefined)
      return [undefined, 'EOF'];
    if (xoric.verbose > 2)
      console.error('TAP.head', ' @#' + pos.toString(16) + ' (' + pos + ')'+ '  #'+b.toString(16).padStart(2, '0') + ' (' + b + ') ');
    if (b === 0x24 && header) {
      header = true;
      break;
    } else if (b === 0x16) {
      header++;
    } else {
      // start over 
      // (this may be needed to skip extra byte!)
      header = 0;
    }
  }

  if (!header)
    return [undefined,
	    'parseFromTap: unknown tap file format, unexpected byte (' + bytes[pos] + ') at ' + pos];

  // extract header data
  let reserved1 = [bytes[++pos], bytes[++pos]];
  let type = bytes[++pos];
  let stype = type === 0x00 ? 'basic' : type === 0x80 ? 'memory' : '';
  let run = bytes[++pos];
  let srun = run === 0x80 ? 'run' : run === 0xc7 ? 'call' : '';
  ++pos; let E = (bytes[pos]<<8) + bytes[pos+1]; ++pos;
  ++pos; let A = (bytes[pos]<<8) + bytes[pos+1]; ++pos;
  let reserved2 = bytes[++pos];
  
  let name = '';
  while (bytes[++pos]) {
    name += String.fromCharCode(bytes[pos]);
  }

  let len = E - A + 1;
  if (xoric.verbose > 2) {
    console.error('parseFromTap.E: ', E);
    console.error('parseFromTap.A: ', A);
    console.error('parseFromTap.length: ', len);
  }

  let data = bytes.slice(pos+1, pos+1 + len);
  pos += data.length;

  let fil = {
    name,
    type,
    stype,
    run,
    srun,
    A,
    E,
    data,
    startpos,
    endpos: pos,
    datalength: data.length,
  }

  if (xoric.verbose > 1)
    console.error('parseFromTap:', fil);
  return [fil, pos];
}

function xoricHelp(msg, e, print) {
  // allow for override when no args
  print = print || console.error;

  if (e && xori.verbose > 1) {
    print('ERROR: ' + e);
    print(e.stack);
  }
  if (msg) 
    print('xoric.js aborted!\n', msg);
  // generic help

  print(`
eXchange ORIC - xoric.js
          eXchange ORIC - xoric.js

 (C) 2020 Jonas S Karlsson (jsk@yesco.org)

    file and format converter for ORIC

==========================================
Usage: node xoric.js FMTLIST FILE ...
 
-h	print help to stderr
-dDIR	change default directory (OUT)
-oNAME	new name for last file
-ONAME	output all (tap?) to one file
-q	quiet, no info output on stderr
-v      more verbose (default 1)
-v -v ... even more (up to 3/4)

FILE
  filename (oric accepts upto 15 chars)

  FOO		- file to read from
  FOO.BAS,AUTO  - mark it to be AUTO loaded
		  (if written out/.tap)
  foo.o,A4#300	- load machine code in page 3
  foo.o,AUTO,A. - -"-, and mark it to be called
  big.txt,A..,E. - if E-A+1 < len(big.txt) trunc!

FMTLIST
  comma(or 2)-separated list formats:

  (input/outout)
    raw = byte array
    hex = hexify bytes in
    b64 = base64 encoding
    txt = string
    bas = string
    bac = ORIC BASIC tokenized
    tap = ORIC .tap (archieve)
    fil = fil(e) object (as below)
    new = create new files (from tap)

  (specific for output)
    dir = [fil, ...] ('json' output from tap)
    new = create new files (from tap)
    num = string (NUMber text lines, see -n)
    unm = string (UNuMber text lines)

  (unsupported)
    dir = [fil, ...]

EXAMPLES
  (default prints to stdout)

  (hex and b64 (base64))
node xoric txt2hex dump.mem > dump.hex # hexdump
node xoric hex2txt dump.hex > dump.mem # 'unhex
node xoric txt2hex dump.hex > dump.2hx # 2xhex

  (NOP)
node xoric hex2hex fil
node xoric XXX2XXX fil

  (make .tap)
node xoric txt2tap a b c > abc.tap   # tap-archieve
node xoric txt2tap a b c -Oabc.tap # tap-archieve
node xoric tap2dir a b c     # "json" dir list
node xoric tap2txt abc.tap   # print a b c stdout
node xoric tap2new           # create files OUT/a OUT/b OUT/c
node xoric tap2new -Dtmp     # create files tmp/a tmp/b tmp/c

  (merge .tap archieves)
node xoric tap2tap a.tap b.tap -Oa.tap

---
Usage: node xoric.js FMTLIST FILE ...
`);
  // repeat as it may have been scrolled away
  if (msg) 
    print('xoric.js aborted!\n', msg);

  print('');
  process.exit(1);
}

if (typeof require !== 'undefined') {
  //
}

// ORIC BASIC KEYWORDS
// https://www.defence-force.org/computing/oric/coding/annexe_1/index.htm
// list augumented with params (jsk)
// and CHAR was mssing?
// MID$ was wrong code
// Note: STR$ indicates a value of 334 for the token - hard to put in a byte! It seems it should be 224 which is free, corrrected (
// 
// NAME \t	CODE \t	PARAMS \n TYPE
//
// PARAMS is my addition:
//   -    = takes no parameters
//   ?    = special syntax
//   n    = takes one number
//   s    = takes one string
//   c    = is a constant
//   nn   = takes two numbers
//   sn   = string and number
//   x/y  = either x or y, both ok
//   n=>n = function taking and giving a num
//   -=>n = takes no params return one num
function OricKeywords(cb) {
  `
!	192	?
instruction
@	198	?
function
#CA NOT - - #CB STEP - -  202 203

+	204	nn=>n
operator
-	205	nn=>n
operator
*	206	nn=>n
operator
/	207	nn=>n
operator
^	208	nn=>n
operator
>	211	nn=>n
operator
=	212	nn=>n
operator
<	213	nn=>n
operator
&	221	n=>n
function
ABS	216	n=>n
function
AND	209	nn=>n
operator
ASC	236	s=>n
function
ATN	229	n=>n
function
AUTO	199	-
parameter
CALL	191	n
instruction
CHAR	176	nnn
instruction
CHR$	237	s=>n
function
CIRCLE	173	nn
instruction
CLEAR	189	-
instruction
CLOAD	182	?
instruction
CLS	148	-
instruction
CONT	187	-
instruction
COS	226	n=>n
function
CSAVE	183	?
instruction
CURMOV	171	nnn
instruction
CURSET	170	nnn
instruction
DATA	145	?
instruction
DEEK	231	n=>n
function
DEF	184	?
instruction
DIM	147	?
instruction
DOKE	138	nn
instruction
DRAW	172	nnn
instruction
EDIT	129	?
instruction
ELSE	200	?
instruction
END	128	-
instruction
EXP	225	n=>n
function
EXPLODE	164	-
instruction
FALSE	240	c
constant
FILL	175	nnn
instruction
FN	196	?
function
FOR	141	?
instruction
FRE	218	n=>n
function
GET	190	?s
function
GOSUB	155	n
instruction
GOTO	151	n
instruction
GRAB	159	n
instruction
HEX$	220	n=>s
function
HIMEM	158	n?
instruction
HIRES	162	-
instruction
IF	153	?
instruction
INK	178	n
instruction
INPUT	146	?s/n?
instruction
INT	215	n=>n
function
KEY$	241	-=>s
function
LEFT$	244	sn=>s
function
LEN	233	s=>n
function
LET	150	?
instruction
LIST	188	?
instruction
LLIST	142	?
instruction
LN	224	n=>n
function
LOG	232	n=>n
function
LORES	137	n
instruction
LPRINT	143	?
instruction
MID$	246	snn=>s
function
MUSIC	168	nnnn
instruction
NEW	193	-
instruction
NEXT	144	?
instruction
NOT	202	n=>n
operator
ON	180	?
instruction
OR	210	nn=>n
operator
PAPER	177	n
instruction
PATTERN	174	n
instruction
PEEK	230	n=>n
function
PI	238	c
constant
PING	166	-
instruction
PLAY	169	nnnn
instruction
PLOT	135	nns/nnn
instruction
POINT	243	nn=>n
function
POKE	185	nn
instruction
POP	134	?
instruction
POS	219	-=>n
function
PRINT	186	?
instruction
PULL	136	?
instruction
READ	149	?
instruction
RECALL	131	?
instruction
RELEASE	160	?
instruction
REM	157	?
instruction
REPEAT	139	?
instruction
RESTORE	154	-
instruction
RETURN	156	?
instruction
RIGHT$	245	sn=>s
function
RND	223	-
function
RUN	152	?
instruction
SCRN	242	nn=>n
function
SGN	214	n=>n
function
SHOOT	163	-
instruction
SIN	227	n=>n
function
SOUND	167	nnn
instruction
SPC	197	n=>s
function
SQR	222	n=>n
function
STEP	203	?
instruction
STOP	179	-
instruction
STORE	130	?
instruction
STR$	234	n=>s
function
TAB	194	??
function
TAN	228	n=>n
function
TEXT	161	-
instruction
THEN	201	?
instruction
TO	195	?
instruction
TROFF	133	-
instruction
TRON	132	-
instruction
TRUE	239	c
constant
UNTIL	140	?
instruction
USR	217	n=>n
function
VAL	235	s=>n
function
WAIT	181	n
instruction
ZAP	165	-
instruction
`.replace(/(\S+)\t(\d+)\t(\S+)\n(\S+)/g,
	  (_, word, code, params, what)=>
	  cb(word, code, what, params));
}

OricKeywords.name2code = {};
OricKeywords.code2name = {};
OricKeywords.type = {};
OricKeywords.params = {};

OricKeywords.defined = [];
OricKeywords.status = {};
OricKeywords.missing = [];
OricKeywords.innovated = [];

OricKeywords((name, code, type, params)=>{
  OricKeywords.name2code[name] = code;
  OricKeywords.code2name[code] = name;
  OricKeywords.type[name] = type;
  OricKeywords.type[code] = type;
  OricKeywords.params[name] = params;
  OricKeywords.params[code] = params;
});

var ORIC_TOKENZ = ',' +
    Object.keys(OricKeywords.name2code)
    .map(k=>k
	 .replace(/\$/g, '\\$')
	 .replace(/\+/g, '\\+')
	 .replace(/\*/g, '\\^')
	 .replace(/\^/g, '\\^')
	 )
    .sort()
    .reverse()
    .join(',') +
    ',';

let rkeywordz = RegExp(
  '^(' + 
    ORIC_TOKENZ.split(/,/)
    .filter(k=>k.length)
    .join('|') +
    ')');

// ------------ MAIN --------------

// if run from nodejs
if (typeof require !== 'undefined') {
  let fs = require('fs');

  let files = [];

  // --- read all from STDIN!
  // we don't know size of stdin...
  try {
    let data = new Uint8Array(1*1024*1024);
    // TODO: utf-8?
    let n = fs.readSync(process.stdin.fd, data);
    data = data.slice(0, n);

    files.push( {
      name: 'STDIN',
      type: 0x00,
      run: 0x00,
      E: undefined,
      A: undefined,
      data,
      datalength: data.length,
    } );
  } catch(e) {}; // no input!
  

  function help(msg, e) {
    return xoricHelp(msg, e);
  }

  let converts = [];
  let dir = 'OUT';
  let args = process.argv.slice(2);

  // if no args, or no stdin, or only -h
  if ((!args.length && !files.length) ||
      (args.length === 1 && args[0] === '-h')) {
    // print help on stdout!
    xoricHelp(undefined, undefined, console.log);
  }

  args.forEach(a=>{
    if (xoric.verbose > 1)
      console.error('xoric.arg: ', a);

    // txt2tap
    if (a.match(/^((raw|hex|b64|txt|bas|new|num|unm|bac|tap|fil|dir)[,2]{0,1})+$/)) {
      converts = converts
	.concat(a.split(/[,2]/g));
      return;
    }

    // help
    if (a.match(/^\-h/)) {
      help();
      return;
    }

    // verbose
    if (a.match(/^\-v/)) {
      xoric.verbose++;
      return;
    }

    // quiet
    if (a.match(/^\-q/)) {
      xoric.verbose = 0;
      return;
    }

    if (a.match(/^\-n/)) {
      a.replace(/^\-n(\d+)(|,(\d+))$/,
		(_,start,__,step)=>{
		  numStart = start;
		  if (step !== undefined)
		    numStep = step;
		});
      if (xoric.verbose)
	console.error('xoric: numStart='+numStart+' numStep='+numStep);
      return;
    }

    // directory
    if (a.match(/^\-d/)) {
      a.replace(/^\-d(.+)/, (_,d)=>dir = d);
      if (!dir)
	help('xoric.dir: -dDIR -d./ but can not be empty! (default OUT)');
      fs.mkdirSync(dir, {recursive: true});
      return;
    }

    // rename last read file (like stdin!)
    if (a.match(/^\-o/)) {
      a = a.replace(/^\-o/, '');
      if (a === '') {
	if (xoric.verbose > 1)
	  help('xoric.rename (-nNewName): can not rename to empty name');
      }
      if (!files.length)
	help('xoric.rename: no file to rename!');
      files[files.length-1].name = a;
      return;
    }

    // assume file name with extras
    let auto, A, E;
    a = a.replace(/,AUTO/i, ()=>{
      auto=true;
      return '';
    });
    a = a.replace(/,A([\d#A-F]+)/i, (_,n)=>{
      n = n.replace(/^#/, '0x0'); // cheat!
      A=parseInt(n);;
      return '';
    });
    a = a.replace(/,E([\d#A-F]+)/i, (_,n)=>{
      n = n.replace(/^#/, '0x0'); // cheat!
      E=parseInt(n);;
      return '';
    });
    let name = a;
    let type = A===undefined ? 0x00 : 0x80;
    let run = auto===undefined ? 0x00 : type==0x00 ? 0x80 : 0xc7;

    let data;
    try {
      data = fs.readFileSync(a);
      E = E || (A && (A + data.length - 1));
      let len = E-A+1;
      if (E) {
	if (len > data.length)
	  help('xoric: Eaddress beyond filesize!');
	if (len < data.length) {
	  if (verbose)
	    console.error('xoric: file truncated because of E (hint: no need add E)');
	  data = data.slice(len);
	}
      }
    } catch(e) {
      help(''+e);
    }

    if (xoric.verbose > 1)
      console.error('xoric.file: ', a, data.length);
    // in case of .tap file it'll be replaced
    files.push( {
      name: a,
      type,
      run,
      E,
      A,
      data,
      datalength: data.length,
    } );
  });

  if (xoric.verbose > 1) {
    console.error('xoric.converts: ', converts);
    console.error('xoric.files: ', files);
  }

  if (!files.length) {
    help('xoric: no files - exiting!');
    process.exit(1);
  }

  function out(fil, to) {
    if (xoric.verbose > 2)
      console.error('xoric.out.fil: ', fil);

    let data = fil.outdata;

    if (to === 'new') { 
      // generate file DIR/NAME
      let name = fil.name || 'EMPTYEMPTYEMPTY';
      name = name.replace(/\//g, '_'); // safe
      name = dir + '/' + name;
      name = name.replace(/\/+/g, '/');
      if (xoric.verbose)
	console.error('----- xoric: gen file: ' + name + ' >>>');

      // create file
      fs.mkdirSync(dir, {recursive: true});
      fs.writeFileSync(name, data);
    } else if (to === 'dir') {
      console.log(fil);
      // don't print bytes out
      return;
    } else {
      process.stdout.write(fil.outdata);
    }

    if (xoric.verbose > 1)
      console.error('<<<--- ', data.length, 'bytes');
  }
  // do the conversions for each input file
  files.forEach(f=>{
    if (xoric.verbose)
      console.error('--- processing', f.name, '>>>');

    // tap files may yield several files
    let fls = xoric(converts[0], converts[1], f.data, f);
    fls.forEach(f=>out(f, converts[1]));
  });
}

// ------------ exports --------------

module.exports = { xoric, atob, btoa, arr2asc, asc2arr, parseFromTap, decodeTap, encodeTap, OricKeywords, ORIC_TOKENZ, rkeywordz};
