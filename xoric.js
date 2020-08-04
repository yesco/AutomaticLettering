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
  a.forEach(c=>t += String.fromCharCode(c));
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
  case 'hex': 
    data = arr2asc(data).match(/.{1,2}/g).map(
      xx=>parseInt(xx, 16));
    break;
  case 'b64':
    data = btoa(arr2asc(data));
    break;
  case 'bas':
  case 'txt':
    //data = asc2arr(data);
    //data = new TextEncoder().encode(arr2asc(data));
    break;
  case 'bac':
    niy();
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
      /\n/g, (a,i)=>'\n' + i<data.length-1 ? xoric.numStart + i * xoric.numStep : '');
      // fall through
  case 'bas':
  case 'txt': return arr2asc(data);
  case 'unm': // UNuMber text line
    data = arr2asc(data).replace(
      /\n\d+\s{0,1}/g, '\n');
    return arr2asc(data);
  case 'bac': niy();
  case 'tap': return encodeTap(fil);
  case 'u8a': return new Uint8Array(data);
  case 'dir': return files;
  default: throw new Error('xoric: unknow to-format: ' + to);
  }
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


// If run from nodejs
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
    if (a.match(/^((raw|hex|b64|txt|bas|new|num|bac|tap|fil|dir)[,2]{0,1})+$/)) {
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

    console.error('xoric.out.to: ', to);
    if (to === 'new') { 
      // generate file DIR/NAME
      let name = fil.name || 'EMPTYEMPTYEMPTY';
      name = name.replace(/\//g, '_'); // safe
      name = dir + '/' + name;
      name = name.replace(/\/+/g, '/');
      if (xoric.verbose)
	console.error('----xoric.out.new: generate file: ' + name + ' >>>>>');

      // create file
      fs.mkdirSync(dir, {recursive: true});
      fs.writeFileSync(name, data);
      if (xoric.verbose > 1)
	console.error('<<<--- ', data.length, 'bytes');
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

module.exports = { xoric, atob, btoa, arr2asc, asc2arr, parseFromTap, decodeTap, encodeTap, };
