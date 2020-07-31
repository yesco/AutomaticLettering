// Generate a "hardcoded fast rom" ala rom method
// (c) jsk@yesco.org

// TODO: read real ROM-file

// 16K INX+DEY+...JMP back - 4.4 MIPS only?
// 16K INX+DEY+...JMP self - 1 KIPS! WTF?
// only JMP self           - 3.18 MIPS
// 256b-4KB loop           - 4.9 MIPS!
// >4KB                    - slows down line to 4.4
// 16K only switch for dest- 4.4 MIPS always
// INC() DEY()             - 8.6 MIPS !!!
// 0bytes JMP self         - 87 MIPS !!!
// 10bytes INX()...        - 147 MIPS
// 20bytes INX()...        - 157 MIPS !!!
// >18 gets sloer fast
// size=20b        funcs   - 157
// size=7b         fucns   - 118
// size=30b         inline - 165
// size=400         inline -  96
// size=400        func    -  17
// size=40        func     -  28


// conclusion:
// - fewer switches better, too many == linear?
// - inlining all === too much code
// - use INX() DEY() for most
// - stable performance at 8.6 MIPS if INX() and few switches

// TODO: compare to "interpreted!" using switch op
function gen(romfile, funcname, address) {
  let size = 16*1024;
  size = 7;

  // PRELUDE
  console.log(`
// Generated from ROM file: ${romfile}
// using 6502-genrom.js
// (c) jsk@yesco.org

// TODO: this generates a speed test dummy rom, change to generate a real rom!

function ${funcname}(M = 5, cpu) {
  var start = Date.now();


  // 20200731 var is still faster than let! (chrome)
  // TODO: cheaper to copy flags in and out
  // than to access through cpu.a ...
  var [a, x, y, c, z, w, s, d, v, ip, sp] = cpu.regsGet();
  var m = cpu.mem;

  function INX(){x=(x+1)&255;ip++;z=!x;s=x>127;iCount++;}
  function DEY(){y=(y-1)&255;ip++;z=!y;s=y>127;iCount++;}

  // TODO: what address to start running at?
  ip = ${address};

  let iCount = 0;

  for(iCount=0; iCount<M*1000*1000; ) {
    ip = ip & 0xffff;

    if (0 && iCount % 1000 === 0)
      console.log(ip.toString(16), x, y, iCount);

    // ROM - no need to decode! hard-compile:
    //console.log('ip==', ip.toString(16));

    // HOW big switch can it handle?
    switch(ip) { // how clever is it
`);

  // INTERLUDE
  for(let a=address; a<address+size; a++) {
    // TODO: handle strange adddresses!
    let p = 'case 0x'+a.toString(16).padStart(4, '0')+':';
    // output case only for destinations!
    if (a === 0xc000)
      console.log(p);

    if (1 && a-address === size-3) { // loop length JMP --- WOW! switch is so SLOW! realy slow!
      console.log(p+`ip=0xc000;iCount++; break; // JMP\n`);
    } else if (0 && address-a === 0) { // just loop in JMP --- ok decent
      console.log(p+`ip=0x${a.toString(16)};iCount++; break; // JMP\n`);
    } else if (0 && address+size-a === 3) { // just loop in JMP --- WOW! switch is so SLOW!
      console.log(p+`ip=0x${a.toString(16)};iCount++; break; // JMP\n`);
    } else if (address+size-a === 3) { // hardcode a    if (1 && address+size-a === 3) { // just loop in JMP --- WOW! switch is so SLOW!
      console.log(p+`ip=0x${a.toString(16)};iCount++; break; // JMP\n`);
    } else if (address+size-a === 3) { // hardcode address! just loop whole rom
      console.log(p+`ip=0xc000;iCount++; break; // JMP\n`);
    } else if (1) { // generate funcall instead1
      // better for large > 256 bytes or so
      if (a % 2 === 0) {
	console.log(`INX();`);
      } else {
	console.log(`DEY();`);
      }
    } else if (a % 2 === 0) {
      console.log(`x=(x+1)&255;ip++;z=!x;s=x>127;iCount++; // INX`);
    } else {
      console.log(`y=(y-1)&255;ip++;z=!y;s=y>127;iCount++; // DEY`);
    }
  }

  // POSTLUDE
  console.log(`
    } // switch
  } // for
  let ms = Date.now()-start;

  // copy regs back to cpu
  cpu.regsPut([a, x, y, c, z, w, s, d, v, ip, sp]);
  var m = cpu.mem;


  return [Math.floor(iCount / ms), iCount, ms, Math.floor(Math.log(iCount)/Math.log(10)+0.5)]; // kips!
}

// Speedtest if run from command line
if (typeof require !== 'undefined') {
  // dummy 'cpu'
  // TODO: replace by real instance!
  let a=0, x=0, y=0, c=0, z=0, w=0, s=0, d=0, v=0, ip=0, sp=0;
  ip = 0xc000;
  let cpu = {
    mem: [],
    regsGet() {
      return [a, x, y, c, z, w, s, d, v, ip, sp];
    },
    regsPut(arr) {
    },
  };

  console.log(${funcname}(1, cpu));
  console.log(${funcname}(2, cpu));
  console.log(${funcname}(5, cpu));
  console.log(${funcname}(10, cpu));
  console.log(${funcname}(100, cpu));
}
`);
}

gen('ORIC-ATMOS.js', 'ORIC_ROM', 0xc000);


