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
  
  app.AddLayout(lay);

  ws = app.CreateWebServer(8080, 'Upload,ListDir');
  ws.SetFolder('/sdcard/DroidScript/ALd');
  ws.AddServlet('/message',  onMessage);
  ws.AddServlet('/get', onGet);
  ws.AddServlet('/put', onPut);
  ws.AddServlet('/list', onList);
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

function onMessage(req, info) {
  app.ShowPopup(JSON.stringify(db));
  back(req, req.msg);
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

// on nodejs command line - a simple shim
if (typeof require !== 'undefined') {
  let http = require('http');
  let fs = require('fs');

  // so stupid! haha
  global.app = {
    // dummies
    GetIPAddress() { return '127.0.0.1'; },
    CreateLayout(x) { return {
      AddChild(x) {
	this.child = this.child || [];
	this.child.push(x);
      },
    }; },
    CreateText(txt) { return {
      txt: txt,
      SetTextSize() {},
    }; },
    AddLayout(x) {
      //JSON.stringify(x, ['txt']));
      JSON.stringify(x, (k,v)=>{
	if (k === 'txt') console.log('UI: ', v);
	return v;
      });
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
	try {
	  let h = ws[path];
	  console.log('  ', h);
	  ws.response = '';
	  h(req, resp);
	  console.log('  =>', ws.response);
	  resp.end(ws.response);
	} catch (e) {
	  console.error(e);
	  try {
	    if (path == '/') path = '/index.html';
	    if (path.match(/(\.\.|\/\/)/)) throw 'Insecure path: ' + path;
	    resp.end(fs.readFileSync(ws.dir + path));
	  } catch(e) {
	    console.error(e);
	    resp.end(`No such path: ${path} !`);
	  }
	}
      }).listen(port, e=>e?console.error(e):0),

      dir: '.',

      // not supported
      folder: '.',
      SetFolder(folder) {
	console.warn('WARN: .SetFolder: NOT SUPPORTED!');
	ws.folder = folder;
      },

      SetResponse(txt) {
	ws.response = txt;
      },

      AddServlet(path, cb) {
	console.log('.AddServlet: ' + path);
	ws[path] = cb;
      },
      Start() {},
    }; return ws; },

  };
  
  OnStart();
}
