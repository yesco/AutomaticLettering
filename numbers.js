function n2a(n) {
  if (n < 0)
    return 'de' + n2a_h(-n) + 'ze';
  else
    return 'da' + n2a_h(n) + 'za';
}

function n2a_h(n) {
  if (n == 0) return 'ma';
  return n2p(n).map(n2a_hh).join('tu');
}

function n2a_hh(n) {
  let x = n2a_x(n);
  let m = n2a_m(n);
  console.log('x=', x);
  console.log('m=', m);
  return !m || x.length < m.length ? x : m;
}

// divide up per position of multiple of 64
// 2*64^3 + 3*64^2 + 7*64^1 + 4*64^0
//   = [2,3,7,4]
function n2p(n) {
  // TODO: decimal numbers
  let r = [];
  while(n) {
    let m = n % 64;
    r.push(m);
    n = Math.trunc(n / 64);
  }
  return r;
}

// conerts 0-63 -> a
function n2a_x(n) {
  if (n > 63) return '                    ';
  let r = '';
  while (n >= 16) {
    r += 'mo';
    n -= 16;
  }
  while (n >= 4) {
    r += 'me';
    n -= 4;
  }
  while (n >= 1) {
    r += 'mu';
    n -= 1;
  }
  return r;
}

function n2a_m(n) {
  if (n % 16 >= 12)
    return '(' + '-me+' + n2a_m(n+4) + ')';
  if (n % 4 >= 2)
    return '(' + '-mu+' + n2a_m(n+1) + ')';
  return n2a_x(n);
}

function n2a_m_bad(n) {
  if (n % 16 == 0) return n2a_x(n);
  if (n >= 3*4) {
    let r = 16 - n % 16;
    let x = 16 * Math.trunc((n+5)/16);
//    if (r > 1+4)
//      ;
//    else
      return n2a_m(r) + '-' + n2a_x(x);
  }
  if (n % 4 == 0) return n2a_x(n);
  if (n >= 3*1) {
    let r = 4 - n % 4;
    let x = 4 * Math.trunc((n+3)/4);
//    if (r > 1)
//      ;
//    else
      return n2a_m(r) + '-' + n2a_x(x);
  }
  return n2a_x(n);
  return '                                ';
  return;
}

function a2n(a) {
  // TODO: remove clean
  a = a.replace(/[\+\(\)\-\W]/g, '');

  // four's complement?
  if (a.startsWith('de')) {
    let vs = a2n(a.substring(2));
    let v = +(vs.match(/ = (\d+)$/));
    return '(fourcomplement 64 - (' +
      vs + ' => 64-' + v + ' = ' +
      (64-v);
  }      
    
  let l = a.split(/(..)/g).filter(_=>_);
  //console.log('a2n.l', a, l);
  let r = '';
  let x;
  let s = 0;
  let last = 0;
  while (x = l.shift()) {
    let v = 0;
    switch (x) {
    case 'mu': r+='1 '; v+=1; break;
    case 'me': r+='4 '; v+=4; break;
    case 'mo': r+='16 '; v+=16; break;
    }
    // if previous is smaller subtract
    if (last < v)
      s = v - s;
    else
      s = s + v;
    last = v;
  }
  return r + ' = ' + s;
}

function search(n) {
  let simple = n2a_x(n);
  let len = simple.length;
  let shortest = len;
  let best = [ [shortest, simple] ];

  function s(i, last, sub, prefix) {
    if (prefix.match(/(..)\1\1/)) {
      console.log('TRIPPLET!', prefix);
      return;
    }
    console.log(`s: ${i} ${last} ${sub} ${prefix} => ${a2n(prefix)}`);
    if (i<=0) return;

    // more strict?
    if (prefix.length >= len) return;
    if (sub*2 > i) return;
    if (sub >= n) return;
    if (sub >= i) return;

    let maxlen = 0;
    function out(a) {
      let fa = prefix + ' ' + a;
      if (fa.length-1 <= shortest) {
	shortest = fa.length-1;
	best.push( [shortest, fa] );
      }
      let star = fa.length-1 < len ? '*' : ' ';
      // alow same length if it's better
      if (fa.length-1 > len) return;
      console.log(n + ' ' + star + ' -- ' + fa + ' = ' + a2n(fa));
    }

    if (prefix !== '') out(n2a_x(i));
    if (prefix.length+2 >= len) return;
    
    if (last >= 16 && sub+16 < n)
      s(i + 16, 16, sub+16, prefix + 'mo');
    if (last >= 4 && sub+4 < n && 4 < i)
      s(i + 4, 4, sub+4, prefix + 'me');
    if (last >= 1 && sub+1 < n)
      s(i + 1, 1, sub+1, prefix + 'mu');
  }

  s(n, 64, 0, '');
  s(64-n, 64, 0, 'de');
  return [n, shortest, best];
}

// only run inside node
if (typeof required !== 'undefined') {
  for(let i=0; i<64; i++) {
    let x = n2a_x(i);
    let xn = a2n(x);
    let m = n2a_m(i)
    let mn = a2n(m);
    let s = search(i);
    console.log(`${i}\t= ${x} = ${xn}`);
    //console.log(`\t  ${m} = ${mn}`);
    console.log(i, 'BEST ', s[1]);
    console.log(s, "\n");
  }
}
