var port = 8080;

var ws;
var db = {};
db['jsk'] = 'Jonas S Karlsson';

function OnStart() {
  var ip = app.GetIPAddress();
  if (ip == '0.0.0.0') { 
    alert('No network - enable wifi');
    app.Exit();
  }

  lay = app.CreateLayout('linear', 'VCenter,FillXY');
  var url = `http://${ip}:${port}`;
  var s = 'Type the following address into your browser\n\n' + url;
  txt = app.CreateText(s, 0.8, 0.5, 'MultiLine');
  txt.SetTextSize(22);
  lay.AddChild(txt);

  var but = app.CreateButton('Popup!', 0.3, 0.3);
  but.SetOnTouch(_=>app.ShowPopup('hello button'));
  lay.AddChild(but);
  
  app.AddLayout(lay);

  ws = app.CreateWebServer(8080, 'Upload,ListDir');
  ws.SetFolder('/sdcard/DroidScript/ALd');
  ws.AddServlet('/message',  onMessage);
  ws.AddServlet('/get', onGet);
  ws.AddServlet('/put', onPut);
  ws.AddServlet('/list', onList);
  ws.AddServlet('/update', onUpdate);
  ws.Start();

  app.OpenUrl(url);
}

function qqq(s) {
  return typeof(s) === 'string' ?
    s.replace(/"/g, '\\"') : s;
}

function back(req, data) {
  if (req.jsonp) {
    ws.SetResponse(
      `${req.jsonp}('${req.tid}', '${qqq(data)}');`);
  } else {
    ws.SetResponse(JSON.stringify(data));
  }
}

var MessagesFile = app.GetAppPath() + '/messages.txt';

function onMessage(req, info) {
  app.ShowPopup(JSON.stringify(db));

  let msg = `${req.user}: ${req.msg}\n`;
  let f = app.CreateFile(MessagesFile, 'rwd');
  f.Seek(req.serverLastPos || 0);

  let lines = [];
  let line;
  // this will read utf-8 lines correctly!
  while (line = f.ReadText('Line')) {
    lines.push(line);
  }

  let pos = f.GetPointer();
  let size = f.GetLength();
  f.Close();

  // this will append utf8 correctly
  if (req.msg !== '')
    app.WriteFile(MessagesFile, msg, 'Append', 'UTF-8');
  
  back(req, `STARTPOS: ${req.serverLastPos} ENDPOS: ${pos}, SIZE: ${size}<br/>` + lines.join('<br/>'));
}

function onGet(req, info) {
  app.ShowPopup(JSON.stringify(db));
  let x = db[req.id];
  // TODO: if none?
  if (x === null || x === undefined)
    x = '';
  back(req, x);
}

function onPut(req, info) {
  app.ShowPopup(JSON.stringify(db));
  db[req.id] = req.data;
  back(req, req.data);
}

function onList(req,  info) {
  app.ShowPopup(JSON.stringify(db));
  back(req, Object.keys(db).join(' '));
}

  // TODO: put in library, for now copied from jml.js
  // a new unique UTC timestamp at millisecond resolution is returned at eacch call
  // it's encoded in hex prefixed with a 't'
  // tHEX of fixed length (1+16 chars)
  function timestamp(optT) {
    if (optT === undefined) {
      optT = Date.now();
      // make sure unique (PER USER),
      // (then should add machine id...)
      // if too much data
      // means timestamp is "fake"
      // should we mark it, or add extra
      // digit? considering that most browsers
      // only give in resolution of 20-100ms
      // maybe it's ok...
      if (optT <= timestamp.last)
	optT = ++timestamp.last;
    } else {
      optT = +optT;
    }
    return 't' +
      (
	'0000000000000000' + optT.toString(16)
      ).substr(-16);
  }
  timestamp.decode = tid=>parseInt(tid.substring(1), 16);
  timestamp.is = tid=>tid.length==17 && tid[0]=='t';

// on DroidScript need to be full path
// relative to what?
let DBLogFileName = './DBLog/facts.log';

  // java: readLine reads only ascii

  // public final String readUTF ()
  // -> don't use! too special for android
  // just use plain ascii...
  // need to quote all unicode...
  // https://developer.android.com/reference/java/io/DataInput#modified-utf-8
  // Reads in a string from this file. The string has been encoded using a modified UTF-8 format.

  // The first two bytes are read, starting from the current file pointer, as if by readUnsignedShort. This value gives the number of following bytes that are in the encoded string, not the length of the resulting string. The following bytes are then interpreted as bytes encoding characters in the modified UTF-8 format and are converted into characters.

  // This method blocks until all the bytes are read, the end of the stream is detected, or an exception is thrown.


function onUpdate(req,  info) {
  app.ShowPopup(JSON.stringify(req.data));
  console.log('DATA=', req.data);

  let tid = timestamp(); // unique
  let logLines = [];
  req.data.forEach(e=>{
    let d = tid + ':::' + e.key + ':::' + e.value;
    logLines.push(d);
  });
  let n = logLines.length;
  logLines = logLines.join('\n');

  console.log(`FILE: size=${size} date=${date}`);

  // app.FileExists(..)
  let f = app.CreateFile(DBLogFileName, 'rwd');
  f.Seek(req.serverLastPos || 0);

  let lines = [];
  let line;
  while (line = f.ReadText('Line')) {
    console.log('LINE: >'+line+'<');
    lines.push(line);
  }

  // file.GetLength()

  // write after read...
  // otherwise will send back what was sent!
  app.AppendFile(DBLogFileName, logLines, 'Append');
  let size = app.GetFileSize(DBLogFileName);
  let date = app.GetFileDate(DBLogFileName);

  back(req, {
    lines_written: n,
    server_timestamp: current_server_timestamp,
    server_pos: size,
    server_date: date,
    new_lines: lines.join('\n'),
  });
}


// on nodejs command line - a simple shim
if (typeof require !== 'undefined') {
  let http = require('http');
  let fs = require('fs');

  let keycb = {};
  function genKey(cb) {
    let g = genKey;
    if (!g.lastKey) 
      g.lastKey = 65;
    let key = String.fromCharCode(g.lastKey++);
    // TODO: bind this?
    keycb[key] = cb;
    return key;
  }

  // so stupid! haha
  let appLayouts = [];
  // display the 'current' UI
  function display() {
    appLayouts.forEach((x,i)=>{
      console.log('---LAYOUT:' + i);
      // use JSON as tree traverser and filter
      JSON.stringify(x, (k,v)=>{
	if (k === 'txt') console.log('UI: '+v.replace(/\n/g, '\nUI: '));
	//if (k === 'key') console.log('UI.KEY: ' + v);
	return v;
      });
    });
    console.log('(? for help)');
  }
  function buttons() {
    console.log('--- BUTTONS:');
    console.log('(press the key to "press" the button)');
    appLayouts.forEach((x,i)=>{
      // use JSON as tree traverser and filter
      JSON.stringify(x, function(k,v) {
	if (k === 'key') console.log(v + ' - ' + this.txt);
	return v;
      });
    });
  }
  
  global.app = {
    // dummies
    GetIPAddress() { return '127.0.0.1'; },
    CreateLayout(x) { return {
      // TODO: capture vertical, horiz...?
      AddChild(x) {
	this.child = this.child || [];
	this.child.push(x);
      },
    }; },
    CreateText(txt, w, h, opts) { return {
      iSetText(txt, opts) {
	if (opts && opts.match(/html/i))
	   txt = txt.replace(/<.*?>/, '');
	this.txt = txt;
	return this;
      },
      SetHtml(h) { return this.iSetText(txt, 'html'); },
      SetTextSize() {},
      // TODO: Maybe this just changes the text on the button? How is it used? If so, then shld redisplay?
      SetText(txt) { return iSetText(txt); },
      SetOnTouch(cb) {
	this.key = genKey(cb);
	this.ontouch = cb;
	this.txt += '(' + this.key + ')';
      },
      // TODO: differnt actions? different 'keys'?
      //SetOnLongTouch(cb) {},
      //SetOnTouchDown(cb) {},
      //SetOnTouchUp(cb) {},
    }.iSetText(txt, opts); },
    CreateButton(txt, w, h, opts) {
      // almost sae
      let r = app.CreateText(txt);
      r.oldiSetText = r.iSetText;
      r.SetText = txt=>{
	return r.oldiSetText(`[${txt}]`)
      };
      return r.iSetText(txt, opts);
    },
    AddLayout(x) {
      appLayouts.push(x);
      display();
    },
    ShowPopup(txt) { console.log('POPUP: ', txt); },
    OpenUrl() {},

    // meat
    CreateWebServer(port, opts) { let ws = {
      server: http.createServer((req, resp)=>{
	console.log('- request ', req.url);
	let u = new URL('http://host' + req.url);
	let path = u.pathname;
	let params = u.searchParams;

	// extend the request
	params.forEach((v,k)=>req[k]=v);
	req.path = u.pathname;
	
	// handle it
	let h = ws[path];
	if (h) {
	  try {
	    console.log('  ', h);
	    ws.response = '';
	    h(req, resp);
	    console.log('  =>', ws.response);
	    resp.end(ws.response);
	    return;
	  } catch (e) {
	    console.error(e);
	  }
	}
	try {
	  if (path == '/') path = '/index.html';
	  if (path.match(/(\.\.|\/\/)/)) throw 'Insecure path: ' + path;
	  resp.end(fs.readFileSync(ws.dir + path));
	  return;
	} catch(e) {
	  console.error(e);
	  resp.end(`No such path: ${path} !`);
	  return;
	}
      }).listen(port, e=>e?console.error(e):0),

      dir: '.',

      // not supported - it's relative to DS folder?
      folder: '.',
      SetFolder(folder) {
	console.warn('WARN: .SetFolder: NOT SUPPORTED!');
	ws.folder = folder;
      },

      SetResponse(txt) {
	ws.response = txt;
      },

      AddServlet(path, cb) {
	console.log('WEB: ' + path);
	ws[path] = cb;
      },
      Start() {},
    }; return ws; },

  };
  
  OnStart();

  // catch keys
  // (https://stackoverflow.com/questions/5006821/nodejs-how-to-read-keystrokes-from-stdin)
  process.stdout.write('\n>');
  let stdin = process.stdin;
  // no block/wait for enter
  stdin.setRawMode( true );
  stdin.resume();
  stdin.setEncoding( 'utf8' );
  stdin.on( 'data', function( key ){
    process.stdout.write(key + '\n');
    if (key === '\u0003') process.exit();
    if (key === '\u0002') buttons();
    if (key === '\u000c') console.clear();
    if (key === '\u0015') display();
    if (key === '?' || key === 'h') console.log(`
HELP - DroidScript.txt
======================
h
?   display help
^C  exit
^U  redraw UI
^L  clear
^B  list active buttons
^A  show appLayouts datastructure

(press any button key)
`);
    if (key === '\u0001') console.log('appLayouts= '+JSON.stringify(appLayouts, null, 2));
    // activate key
    if (keycb[key]) keycb[key]();
    // write the key to stdout all normal like
    //process.stdout.write('(KEY:' + key + ')\n');
    process.stdout.write('>');
  });
}
