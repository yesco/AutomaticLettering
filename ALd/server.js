/**
Before running:
> npm install ws
Then:
> node server.js
> open http://localhost:8080 in the browser
*/

const http = require('http');
const fs = require('fs');
const ws = new require('ws');

const wss = new ws.Server({noServer: true});
const clients = new Set();
const groups = {};

function group(grp) {
  if (!grp) return grp;
  if (typeof(grp) == 'object' &&
      grp.constructor.name == 'WeakMap')
    return grp;
  let g = groups[grp];
  if (!g) g = groups[grp] = new WeakSet();
  return g;
}

function join(grp, who) {
  group(grp).add(who);
}

function leave(grp, who) {
  group(grp).delete(who);
}
  
function members(grp, who) {
}

function sendall(msg, optGrp) {
  optGrp = group(optGrp);
  for(let client of clients) {
    if (!optGrp || optGrp.has(client))
      client.send(msg);
  }
}

function notify(from, to, why, msg) {
  let tname = to ? to : 'all';
  let txt = `[notify ${from} ${tname} ${why} ${msg}]`;
  sendall(txt, group(to));
}


// group: clock
setInterval(()=>notify('clock', 'clock', 'second', new Date().toISOString()), 1000);

setInterval(()=>notify('clock', undefined, 'second', new Date().toISOString()), 3000);

function onMessage(client, msg) {
  function ifdo(pat, act) {
    msg.replace(pat, function(all,...rest){
      log(`  - ifdo ${pat}\n     => ${act}`);
      act(...rest);
    });
  }

  msg = msg.replace(/ +/g, ' ')
    .replace(/[\[\]]/g, '')
    .trim();

  ifdo(/^notify (\S+) /,
       (user)=>client.username=user);

  ifdo(/^notify (\S+) (\S+) join\b/,
       (user,grp)=>join(grp, client));

  ifdo(/^notify (\S+) (\S+) leave\b/,
       (user,grp)=>leave(grp, client));

  ifdo(/^notify (\S+) (\S+) members\b/,
       (user,grp)=>members(grp, user));
}

function onSocketConnect(ws) {
  clients.add(ws);
  log(`new connection`);
  sendall(`? entered`);

  function send(msg) {
    ws.send(msg);
  }
  
  ws.on('message', function(msg) {
    log(`>${msg}`);

    onMessage(ws, msg);

    sendall(msg);
  });

  ws.on('close', function() {
    log(`connection closed`);
    clients.delete(ws);
    sendall(`? left`);
  });
}

// admin
let log;
if (!module.parent) {
  log = console.log;
  http.createServer(accept).listen(8080);
} else {
  // to embed into javascript.info
  log = function() {};
  // log = console.log;
  exports.accept = accept;
}

function accept(req, res) {
  if (req.url == '/ws' && req.headers.upgrade &&
      req.headers.upgrade.toLowerCase() == 'websocket' &&
      // can be Connection: keep-alive, Upgrade
      req.headers.connection.match(/\bupgrade\b/i)) {
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), onSocketConnect);
  } else if (req.url == '/') {
    fs.createReadStream('./chat.html').pipe(res);
  } else { // page not found
    res.writeHead(404);
    res.end();
  }
}
