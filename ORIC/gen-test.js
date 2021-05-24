function funcs(n) {
  var on = n;
  var ip=0, a=0, x=0, y=0, ip=0, z=0, s=0, iCount=0;

  var m = [INX, DEY, DEY, INX, DEY, JMP, 00, 00];
  function INX(){x=(x+1)&255;ip++;z=!x;s=x>127;iCount++;}
  function DEY(){y=(y-1)&255;ip++;z=!y;s=y>127;iCount++;}
  function JMP(a){ip=a;iCount++;}


  let start = Date.now();
  while(iCount < n) {
    INX(); DEY(); DEY(); INX(); DEY();
    JMP(m[6]+m[7]);
  }

  return iCount;
}

function arr(n) {
  var on = n;
  var a=0, x=0, y=0, ip=0, z=0, s=0, iCount=0;
  var map = [INX, DEY, DEY, INX, DEY, JMP, 00, 00];
  var m = [0, 1, 2, 3, 4, 5, 0, 0];
  
  function INX(){x=(x+1)&255;ip++;z=!x;s=x>127;iCount++;}
  function DEY(){y=(y-1)&255;ip++;z=!y;s=y>127;iCount++;}
  function JMP(){ip=m[ip+1]+(m[ip+2]<<8);iCount++;}


  let start = Date.now();
  var d = 7;
  var op, i, f;
  while(--n > 0) {
    if (1) {
      f = op=map[i=m[ip]];
      f();
    } else {
      map[m[ip]]();
    }
  }

  return iCount;
}

function tail(x) {
    if (x == 1) {
        return 1;
    } else {
        return tail(x-1);
    }
}

function test(f, n) {
  let start = Date.now();

  let iCount = f(n);

  let ms = Date.now() - start;

  console.log(
    f.name.padEnd(10),
    iCount.toString().padStart(10),
    (iCount/ms).toFixed(2).toString().padStart(10));
}
  
test(funcs, 100000);
test(funcs, 1000000);
test(funcs, 10000000);
test(funcs, 100000000);

test(arr, 100000);
test(arr, 1000000);
test(arr, 10000000);
test(arr, 100000000);

// doesn't optimize tail recursion?
//tail(10000000);
