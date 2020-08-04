//          eXchange ORIC - xoric.js
//
// (C) 2020 Jonas S Karlsson (jsk@yesco.org)
//
//    file and format converter for ORIC

// formats:
//    raw = byte array
//    hex = hexify bytes in
//    b64 = base64 encoding
//    txt = string (utf-8!)
//    bas = string (utf-8!)
//    lns = string (utf-8!) (will number lines)
//    bac = ORIC BASIC tokenized
//    tap = ORIC .tap (archieve)
//    fil = fil(e) object (as below)
//    dir = [fil, ...]
// 
//    dsk = not supported
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
    
function xoric(from, to='txt', data) {
  if (data == undefined) return;

  function niy() {
    throw new Error('not implemented');
  }

  function expect(typ) {
    if (typeof data !== typ) {
      if (typ === 'Array' && !Array.isArray(data))
	throw new Error('xoric: input type mismatch');
    }
  }

  function a2t(a) {
    //a = new Uint8Array(a);
    //return new TextDecoder('utf-8').decode(a);
    let t = '';
    a.forEach(c=>t += String.fromCharCode(c));
    return t;
  }

  function t2a(t) {
    let a = new Uint8Array(t.length);
    for(let i=0; i<t.length; i++)
      a[i] = s.charCodeAt(i);
    return a;
  }


  let files;

  // normalize from-format => byte array
  switch(from) {
  case 'raw': expect('Array'); break;
  case 'hex': 
    data = a2t(data).match(/.{1,2}/g).map(
      xx=>parseInt(xx, 16));
    break;
  case 'b64':
    data = btoa(a2t(data));
    break;
  case 'lns': 
    data = ('\n' + a2t(data)).replace(
      /\n/g, (a,i)=>'\n' + i<data.length-1 ? i * 10 : '');
    data = t2a(data);
    // fall through to make bytes
  case 'bas':
  case 'txt':
    //data = new TextEncoder().encode(a2t(data));
    break;
  case 'bac': expect('Array');
    niy();
  case 'tap': expect('Array'); {
    files = decodeTap(data);
    break; }
  default: throw new Error('xoric: unknow from-format: ' + from);
  }

  data = new Uint8Array(data);

  // beware, this only takes first file
  if (files && to !== 'dir') {
    data = files[0].data;
  }

  // saved byte array to following format
  switch(to) {
  case 'raw': return data;
  case 'hex': return data.map(b=>b.toString(16).padStart(2, '0')).join('');
  case 'b64': return atob(data);
  case 'bas':
  case 'txt': return new TextDecoder('utf-8').decode(data);
  case 'bac': niy();
  case 'tap': return encodeTap(name, data);
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

  let E = fil.E || A + fil.data.length;
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
      .concat(new TextDecoder('utf-8').decode(fil.name))
      .concat([0]) // zero-terminated name
      .concat(fil.data);
  // TODO: should we add extra byte???

  return bytes;
}

function decodeTap(name, data) {
  let files = [];
  while (file = parseFromTap(data, pos)) {
    files.push(file);
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
  if (typeof bytes !== 'object' ||
      !Array.isArray(bytes))
    throw new Error('parseFromTap: expect array');

  let startpos = pos;

  if (pos+1 >= bytes.length) {
    return [undefined, undefined];
  }

  // parse header (we allow N * 0x16 + 1 0x24)
  let header = true;
  while (1) {
    let b = bytes[++pos];
    if (b === 0x24) {
      break;
    } else if (b !== 0x16) {
      header = false;
    }
  }

  if (!header)
    return [undefined,
	    'parseFromTap: unknown tap file format, unexpected byte (' + bytes[pos] + ') at ' + pos];

  // extract header data
  let reserved1 = [bytes[++pos], bytes[++pos]];
  let typ = bytes[++pos];
  let styp = typ === 0x00 ? 'basic' : typ === 0x80 ? 'memory' : '';
  let run = bytes[++pos];
  let srun = run === 0x80 ? 'run' : run === 0xc7 ? 'call' : '';
  ++pos; let E = (bytes[pos]<<8) + bytes[pos+1]; ++pos;
  ++pos; let A = (bytes[pos]<<8) + bytes[pos+1]; ++pos;
  let reserved2 = bytes[++pos];
  
  let name = '';
  while (bytes[++pos]) {
    name += String.fromCharCode(bytes[pos]);
  }

  let data = bytes.slice(startpos+1, pos);
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
    endpos,
    length: data.length,
  }

  return [fil, pos + data.length];
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
      length: data.length,
    } );
  } catch(e) {}; // no input!
  

  let converts = [];

  let args = process.argv.slice(2);
  args.forEach(a=>{
    console.error('xoric.arg: ', a);

    // txt2tap
    if (a.match(/^((raw|hex|b64|txt|bas|lns|bac|tap|fil|dir)[,2]{0,1})+$/)) {
      converts = converts
	.concat(a.split(/[,2]/g));
      return;
    }

    // rename last read file (like stdin!)
    if (a.match(/^\-n/)) {
      a = a.replace(/^\-n/, '');
      if (a === '') {
	console.error('xoric.rename (-nNewName): can not rename to empty name');
	process.exit(1);
      }
      if (!files.length) {
	console.error('xoric.rename: no file to rename!');
	process.exit(1);
      }
      files[files.length-1].name = a;
      return;
    }

    // assume file name with extras
    let auto, A;
    a = a.replace(/,AUTO/i, ()=>{
      auto=true;
      return '';
    });
    a = a.replace(/,A([\d#A-F]+)/i, (_,a)=>{
      a = a.replace(/^#/, '0x0'); // cheat!
      A=parseInt(a);;
      return '';
    });
    let name = a;
    let type = A===undefined ? 0x00 : 0x80;
    let run = auto===undefined ? 0x00 : type==0x00 ? 0x80 : 0xc7;

    let data = fs.readFileSync(a);
    console.error('xoric.file: ', a, data.length);
    // in case of .tap file it'll be replaced
    files.push( {
      name: a,
      type,
      run,
      E: A && (A + data.length) || 0,
      A,
      data,
      length: data.length,
    } );
  });

  console.error('xoric.converts: ', converts);
  console.error('xoric.files: ', files);

  let f = files[0];
  if (!f) {
    console.error('xoric: no files - exiting!');
    process.exit(1);
  }
  let r = xoric(converts[0], converts[1], f.data);
  console.error('----------------------------');
  process.stdout.write(r);
}


module.exports = { xoric, atob, btoa, parseFromTap, decodeTap, encodeTap, };
