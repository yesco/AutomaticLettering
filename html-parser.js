function parseScript() { }
function parseStyle() { }

function htmlParse(h) {
  let indent = 0;
  function print(o) {
    console.log('  '.repeat(indent) + o);
  }

  let path = [];
  function start(tag, attr) {
    path.push(tag);
    print('<'+tag+'>');
    indent++;
    Object.keys(attr).forEach(
      k=>print('   '+k+'='+attr[k]));
  }
  function end(tag) {
    if (indent <= 0) throw Error('end: not matched: '+tag);
    let p;
    while(indent && typeof(p=path.pop()) !== undefined) {
      indent--;
      //console.log(indent, tag, p);
      print('</'+p+'>');
      if (p === tag) break;
    }
  }
  function content(txt) {
    print(txt);
  }

  h = h.replace(
    /<\s*script([\s\S]+?)<\/script>/g,
    parseScript);
  h = h.replace(
    /<\s*style([\s\S]+?)<\/style>/g,
    parseStyle);

  let a = h.split(/(<[^>]*?\>)/g);
  console.log(a);

  let x, txt = '';
  while ((x = a.shift()) !== undefined) {
    //print('['+x+']');

    if (!x) continue;

    if (x[0] === '<') { 

      x = x.substr(1); // skip <
      let isendtag;
      x = x.replace(
	/^\s*\/\s*/, ()=>(isendtag=true,''));

      let tag;
      x = x.replace(
	/^(\w+)/, (a,t)=>(tag=t,''));
      if (!tag)
	throw Error('startTag no tag in: ' + x);
      tag = tag.toLowerCase();

      if (isendtag) {
	end(tag);
	continue;
      }

      // get attr
      let attr = {};
      x = x.replace( // quoted
	/(\w+)\s*=\s*(['"])(.*?)\2/g, 
	(a,name,q,str)=>(attr[name]=str,''))
      .replace( // not quoted
	/(\w+)\s*=\s*([^>\s\/]+?)\b/g,
	(a,name,str)=>(attr[name]=str,''))
      .replace(/(\w+)/g, // flag
	       (a,name)=>(attr[name]=name,''));

      start(tag, attr);

      // self-terminated?
      if (x.endsWith('/>')) end(tag);

      // self-terminating tag?
      if (',area,base,br,embed,hr,iframe,img,input,link,meta,param,source,track,'.match(tag))
	end(tag);

      x = x.replace(/>/, '');
      // check any misses
      x = x.trim();
      if (x) throw 'parseHtml: something left: "'+x+'"';
    } else {
      // content
      content(x);
      txt += x;
    }
  }
  end('ALL');
  return a;
}

// to make it go wrong: '<' or '>' inside attr!
//h = `foobar<fie a=foo wrong='TAGG</TAG>ENDTAGG' b="bar" c='fie' b="fum'fum" c='fish"fish'>rab<tag turnon></fie><gat>oof`;

h = `<body>foobar<fie a=foo b="bar" c='fie' b="fum'fum" c='fish"fish'>rab<tag turnon></fie><gat>oof`;

console.log(h);
console.log(htmlParse(h));
