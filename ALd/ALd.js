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
  ws.SetFolder('/sdcard/DroidScript');
  ws.AddServlet('/message',  onMessage);
  ws.AddServlet('/get', onGet);
  ws.AddServlet('/put', onPut);
  ws.AddServlet('/list', onList);
  ws.Start();

  app.OpenUrl(url);
}

function onMessage(req, info) {
  app.ShowPopup(JSON.stringify(req)+'\n'+JSON.stringify(db));
  ws.SetResponse('Got message!');
}

function onGet(req, info) {
  app.ShowPopup(JSON.stringify(req)+'\n'+JSON.stringify(db));
  let x = db[req.id];
  ws.SetResponse(req.id + '=' + x);
}

function onPut(req, info) {
  app.ShowPopup(JSON.stringify(req)+'\n'+JSON.stringify(db));
  db[req.id] = req.data;
  ws.SetResponse('putted');
}

function onList(req,  info) {
  app.ShowPopup(JSON.stringify(req)+'\n'+JSON.stringify(db));
  let x = JSON.stringify(Object.keys(db));
  ws.SetResponse(x);
}
