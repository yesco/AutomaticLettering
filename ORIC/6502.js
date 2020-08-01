/* 6502.js heaviy edited by jsk@yesco.org

   File originally from:
   - https://github.com/6502/js6502

   I like the potential simplicity, and
   orthogonality in describing the instructions,
   but this file is heavy modified for the
   foloowing reasons:
   - it'll have potential problems with
     self-modifying code as it tries to
     'jit' every instance of instruction!
   - Also, no BCD. (supposedly nobody uses...)
   - And no trap jsr/jmp for rom
   - no explic interrupt handling, I realize
     this is more a simulator "hardware issue"

  /Jonas

*/

// and I'd really like to move this to the end...

/****************************************************************************
******************************************************************************
**                                                                          **
**  Copyright (c) 2012 by Andrea Griffini                                   **
**                                                                          **
**  Permission is hereby granted, free of charge, to any person obtaining   **
**  a copy of this software and associated documentation files (the         **
**  "Software"), to deal in the Software without restriction, including     **
**  without limitation the rights to use, copy, modify, merge, publish,     **
**  distribute, sublicense, and/or sell copies of the Software, and to      **
**  permit persons to whom the Software is furnished to do so, subject to   **
**  the following conditions:                                               **
**                                                                          **
**  The above copyright notice and this permission notice shall be          **
**  included in all copies or substantial portions of the Software.         **
**                                                                          **
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,         **
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF      **
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND                   **
**  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE  **
**  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION  **
**  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION   **
**  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.         **
**                                                                          **
******************************************************************************
 ****************************************************************************/

// var is faster than let! about 5%! 20200730
function cpu6502() {
  // Note: special read/write only works for LDA/STA absolute

  // key=address, value=function(data){...}
  var special_write = { };

  // key=address, value=function(){...}
  var special_read = { };

  // Virtual CPU ////////////////////////////////////////////////////////

  var m = new Uint8Array(65536);

  var alive = true;
  var current_f = null;
  var a=0, x=0, y=0,
      c=0, z=0, w=0, s=0, d=0, v=0, i=0, b=0,
      ip=0, sp=0;

  // calculate status register
/*
SR Flags (bit 7 to bit 0):

N	....	Negative
V	....	Overflow
-	....	ignored
B	....	Break
D	....	Decimal (use BCD for arithmetics)
I	....	Interrupt (IRQ disable)
Z	....	Zero
C	....	Carry
*/
  function SR() {
    let sr = 0;
    sr <<= 1; sr += s?1:0; // N
    sr <<= 1; sr += v?1:0; // V
    sr <<= 1;              // -
    sr <<= 1; sr += b?1:0; // B

    sr <<= 1; sr += d?1:0; // D
    sr <<= 1; sr += i?1:0; // I
    sr <<= 1; sr += z?1:0; // Z
    sr <<= 1; sr += c?1:0; // C
    return sr;
  }

  function setSR(sr) {
    s = (sr && 1); sr >>>= 1; // N
    v = (sr && 1); sr >>>= 1; // V
                   sr >>>= 1; // -
    b = (sr && 1); sr >>>= 1; // B

    d = (sr && 1); sr >>>= 1; // D
    i = (sr && 1); sr >>>= 1; // I
    z = (sr && 1); sr >>>= 1; // Z
    c = (sr && 1); sr >>>= 1; // C
  }
    
  // Lazy Z/S evaluation; set_[sz] contains the code to set the flag
  // s[sz](x) sets this code, f[sz]() returns the code and clears it.
  var set_z = "";
  var set_s = "";

  function sz(x)  { set_z = "z=!(" + x + ");"; }
  function ss(x)  { set_s = "s=((" + x + ")>127);"; }
  function ssz(x) { sz(x); ss(x); }
  
  function fz()   { var oz=set_z; set_z=""; return oz; }
  function fs()   { var os=set_s; set_s=""; return os; }
  function fsz()  { return fz()+fs(); }

  function fszm() {
    // Special case; if current delayed
    // S/Z flags are from memory then we
    // must evaluate them before any
    // memory write. If they're from
    // registers then we can instead
    // just keep delaying...
    return (
      (set_z.indexOf("m")!=-1 ? fz() : "") +
      (set_s.indexOf("m")!=-1 ? fs() : ""));
  }

  // Addressing modes

  var modes = {
    ___()  { },

    imm() { return ""+m[ip++]; },
    zpg() { return "m["+m[ip++]+"]"; },
    zpx() { return "m[(x+"+m[ip++]+")&255]"; },
    zpy() { return "m[(y+"+m[ip++]+")&255]"; },
    abs() { ip+=2; return "m["+(m[ip-2]+(m[ip-1]<<8))+"]"; },
    abx() { ip+=2; return "m[(x+"+(m[ip-2]+(m[ip-1]<<8))+")&65535]"; },
    aby() { ip+=2; return "m[(y+"+(m[ip-2]+(m[ip-1]<<8))+")&65535]"; },
    iix() { var z=m[ip++]; return "m[m[("+z+"+x)&255]+(m[("+(z+1)+"+x)&255]<<16)]"; },
    iiy() { var z=m[ip++]; return "m[(m["+z+"]+(m["+((z+1)&255)+"]<<16)+y)&65535]"; },
    rel() { var delta=m[ip++]; if(delta>=128)delta-=256; return ""+((ip+delta)&65535); },
    adr() { ip+=2; return ""+(m[ip-2]+(m[ip-1]<<8)); },
    ind() { var z=m[ip]+m[ip+1]*256; ip+=2; return "m["+z+"]+(m["+((z+1)&65535)+"]<<8)"; },
    acc() { return "a"; },
  };

  function hex(n,x) {
    var r = "";
    for (var k=0; k<n; k++) {
      r = "0123456789ABCDEF"[x & 15] + r;
      x >>= 4;
    }
    return r;
  }

  // Opcode implentation

  let ops = {
    ___()  { return "{*Invalid opcode*}"; },

    adc(m) { ssz("a"); return "w="+m+"+a+c;c=(w>255);v=((a&0x80)!=(w&0x80));a=(w&255);"; },
    and(m) { ssz("a"); return "a&="+m+";"; },
    asl(m) { ssz(m); return "w=("+m+"<<1);c=(w>255);"+m+"=w&255;"; },
    bcc(m) { return "if(!c){"+fsz()+"ip="+m+";return;}"; },
    bcs(m) { return "if(c){"+fsz()+"ip="+m+";return;}"; },
    beq(m) { return fz()+"if(z){"+fs()+"ip="+m+";return;}"; },
    bit(m) { sz("a&"+m); ss(m); return "v=(("+m+"&0x40)!=0);"; },
    bmi(m) { return fs()+"if(s){"+fz()+"ip="+m+";return;}"; },
    bne(m) { return fz()+"if(!z){"+fs()+"ip="+m+";return;}"; },
    bpl(m) { return fs()+"if(!s){"+fz()+"ip="+m+";return;}"; },
    brk(m) { throw 'BRK: at address = ' + hex(4,ip);
             return fsz()+";i=1;"+
	     // "jsr" but go to different address
	     fsz()+"m[256+sp]="+((ip-1)&255)+";m[256+((sp+1)&255)]="+((ip-1)>>8)+";sp=(sp+2)&255;"+
	     ops.php(m)+
	     "ip=m[IRQ_VECTOR]+m[IRQ_VECTOR+1]*256;"
	   },
    bvc(m) { return "if(!v){"+fsz()+"ip="+m+";return;}"; },
    bvs(m) { return "if(v){"+fsz()+"ip="+m+";return;}"; },
    clc(m) { return "c=0;"; },
    cld(m) { return "d=0;"; },
    cli(m) { return "i=0;"; },
    clv(m) { return "v=0;"; },
    cmp(m) { ssz("w"); return "c=(a>="+m+");w=(a-"+m+")&255;"; },
    cpx(m) { ssz("w"); return "c=(x>="+m+");w=(x-"+m+")&255;"; },
    cpy(m) { ssz("w"); return "c=(y>="+m+");w=(y-"+m+")&255;"; },
    dec(m) { ssz(m); return "maykill("+m.substr(2,m.length-3)+");"+m+"=("+m+"-1)&255;if(!alive){ip="+ip+";return;}"; },
    dex(m) { ssz("x"); return "x=(x-1)&255;"; },
    dey(m) { ssz("y"); return "y=(y-1)&255;"; },
    eor(m) { ssz("a"); return "a^="+m+";"; },
    inc(m) { ssz(m); return "maykill("+m.substr(2,m.length-3)+");"+m+"=("+m+"+1)&255;if(!alive){ip="+ip+";return;}"; },
    inx(m) { ssz("x"); return "x=(x+1)&255;"; },
    inx(m) { ssz("x"); return "x=(x+1)&255;"; },
    iny(m) { ssz("y"); return "y=(y+1)&255;"; },
    jmp(m) { return fsz()+"ip="+m+";"; },
    jsr(m) { return fsz()+"m[256+sp]="+((ip-1)&255)+";m[256+((sp+1)&255)]="+((ip-1)>>8)+";sp=(sp+2)&255;ip="+m+";return;"; },
    lda(m) { ssz("a"); return "a="+m+";"; },
    ldx(m) { ssz("x"); return "x="+m+";"; },
    ldy(m) { ssz("y"); return "y="+m+";"; },
    lsr(m) { ssz(m); return "c="+m+"&1;"+m+">>=1;"; },
    nop(m) { return ""; },
    ora(m) { ssz("a"); return "a|="+m+";"; },
    pha(m) { return "m[256+sp]=a;sp=(sp+1)&255;"; },
    php(m) { return "m[256+sp]=SR();sp=(sp+1)&255;"; },
    pla(m) { ssz("a"); return "sp=(sp-1)&255;a=m[256+sp];"; },
    plp(m) { return "sp=(sp-1)&255;setSR(m[256+sp]);"; },

    rol(m) { ssz(m); return "w="+m+";"+m+"=((w<<1)+c)&255;c=(w>127);"; },
    ror(m) { ssz(m); return "w="+m+";"+m+"=((w>>1)+(c<<7));c=(w&1);"; },
    rti(m) { return ops.plp(m)+ops.rts(m)+'ip--;'; throw "er";},
    rts(m) { return fsz()+"sp=(sp-2)&255;ip=(m[sp+256]+(m[256+((sp+1)&255)]<<8)+1)&65535;"; },
    sbc(m) { ssz("w"); return "w=a-"+m+"-(1-c);c=(w>=0);v=((a&0x80)!=(w&0x80));a=(w&255);"; },
    sec(m) { return "c=1;"; },
    sed(m) { throw "Not implemented"; },
    sei(m) { return "i=0;"; },
    sta(m) { return "maykill("+m.substr(2,m.length-3)+");"+fszm()+m+"=a;if(!alive){ip="+ip+";return;}"; },
    stx(m) { return "maykill("+m.substr(2,m.length-3)+");"+fszm()+m+"=x;if(!alive){ip="+ip+";return;}"; },
    sty(m) { return "maykill("+m.substr(2,m.length-3)+");"+fszm()+m+"=y;if(!alive){ip="+ip+";return;}"; },
    tax(m) { ssz("a"); return "x=a;"; },
    tay(m) { ssz("a"); return "y=a;"; },
    tsx(m) { ssz("x"); return "x=sp;"; },
    txa(m) { ssz("a"); return "a=x;"; },
    txs(m) { return "sp=x;"; },
    tya(m) { ssz("a"); return "a=y;"; },
  };

  var opcodes =
      /*    0,8           1,9           2,A           3,B           4,C           5,D           6,E           7,F  */
      [["brk","imm"],["ora","iix"],["___","___"],["___","___"],["___","___"],["ora","zpg"],["asl","zpg"],["___","___"],  // 00
       ["php","___"],["ora","imm"],["asl","acc"],["___","___"],["___","___"],["ora","abs"],["asl","abs"],["___","___"],  // 08
       ["bpl","rel"],["ora","iiy"],["___","___"],["___","___"],["___","___"],["ora","zpx"],["asl","zpx"],["___","___"],  // 10
       ["clc","___"],["ora","aby"],["___","___"],["___","___"],["___","___"],["ora","abx"],["asl","abx"],["___","___"],  // 18
       ["jsr","adr"],["and","iix"],["___","___"],["___","___"],["bit","zpg"],["and","zpg"],["rol","zpg"],["___","___"],  // 20
       ["plp","___"],["and","imm"],["rol","acc"],["___","___"],["bit","abs"],["and","abs"],["rol","abs"],["___","___"],  // 28
       ["bmi","rel"],["and","iiy"],["___","___"],["___","___"],["___","___"],["and","zpx"],["rol","zpx"],["___","___"],  // 30
       ["sec","___"],["and","aby"],["___","___"],["___","___"],["___","___"],["and","abx"],["rol","abx"],["___","___"],  // 38
       ["rti","___"],["eor","iix"],["___","___"],["___","___"],["___","___"],["eor","zpg"],["lsr","zpg"],["___","___"],  // 40
       ["pha","___"],["eor","imm"],["lsr","acc"],["___","___"],["jmp","adr"],["eor","abs"],["lsr","abs"],["___","___"],  // 48
       ["bvc","rel"],["eor","iiy"],["___","___"],["___","___"],["___","___"],["eor","zpx"],["lsr","zpx"],["___","___"],  // 50
       ["cli","___"],["eor","aby"],["___","___"],["___","___"],["___","___"],["eor","abx"],["lsr","abx"],["___","___"],  // 58
       ["rts","___"],["adc","iix"],["___","___"],["___","___"],["___","___"],["adc","zpg"],["ror","zpg"],["___","___"],  // 60
       ["pla","___"],["adc","imm"],["ror","acc"],["___","___"],["jmp","ind"],["adc","abs"],["ror","abs"],["___","___"],  // 68
       ["bvs","rel"],["adc","iiy"],["___","___"],["___","___"],["___","___"],["adc","zpx"],["ror","zpx"],["___","___"],  // 70
       ["sei","___"],["adc","aby"],["___","___"],["___","___"],["___","___"],["adc","abx"],["ror","abx"],["___","___"],  // 78
       ["___","___"],["sta","iix"],["___","___"],["___","___"],["sty","zpg"],["sta","zpg"],["stx","zpg"],["___","___"],  // 80
       ["dey","___"],["___","___"],["txa","___"],["___","___"],["sty","abs"],["sta","abs"],["stx","abs"],["___","___"],  // 88
       ["bcc","rel"],["sta","iiy"],["___","___"],["___","___"],["sty","zpx"],["sta","zpx"],["stx","zpy"],["___","___"],  // 90
       ["tya","___"],["sta","aby"],["txs","___"],["___","___"],["___","___"],["sta","abx"],["___","___"],["___","___"],  // 98
       ["ldy","imm"],["lda","iix"],["ldx","imm"],["___","___"],["ldy","zpg"],["lda","zpg"],["ldx","zpg"],["___","___"],  // A0
       ["tay","___"],["lda","imm"],["tax","___"],["___","___"],["ldy","abs"],["lda","abs"],["ldx","abs"],["___","___"],  // A8
       ["bcs","rel"],["lda","iiy"],["___","___"],["___","___"],["ldy","zpx"],["lda","zpx"],["ldx","zpy"],["___","___"],  // B0
       ["clv","___"],["lda","aby"],["tsx","___"],["___","___"],["ldy","abx"],["lda","abx"],["ldx","aby"],["___","___"],  // B8
       ["cpy","imm"],["cmp","iix"],["___","___"],["___","___"],["cpy","zpx"],["cmp","zpg"],["dec","zpg"],["___","___"],  // C0
       ["iny","___"],["cmp","imm"],["dex","___"],["___","___"],["cpy","abs"],["cmp","abs"],["dec","abs"],["___","___"],  // C8
       ["bne","rel"],["cmp","iiy"],["___","___"],["___","___"],["___","___"],["cmp","zpx"],["dec","zpx"],["___","___"],  // D0
       ["cld","___"],["cmp","aby"],["___","___"],["___","___"],["___","___"],["cmp","abx"],["dec","abx"],["___","___"],  // D8
       ["cpx","imm"],["sbc","iix"],["___","___"],["___","___"],["cpx","zpg"],["sbc","zpg"],["inc","zpg"],["___","___"],  // E0
       ["inx","___"],["sbc","imm"],["nop","___"],["___","___"],["cpx","abs"],["sbc","abs"],["inc","abs"],["___","___"],  // E8
       ["beq","rel"],["sbc","iiy"],["___","___"],["___","___"],["___","___"],["sbc","zpx"],["inc","zpx"],["___","___"],  // F0
       ["sed","___"],["sbc","aby"],["___","___"],["___","___"],["___","___"],["sbc","abx"],["inc","abx"],["___","___"]]; // F8

  var revopcodes = {};
  (function() {
    for (var k=0; k<256; k++)
      revopcodes[opcodes[k][0]+"/"+opcodes[k][1]] = i;
  })();

  // TODO(jsk): rewrite jit to generate static
  // functions not dependent on address
  var jitcode = [];
  var jitmap = [];
  var jitstoppers = ["jmp", "jsr", "rts", "brk", "rti", "irq", "nmi"];

  function maykill(m) {
    var aL = jitmap[m];
    while (aL && aL.length) {
      var f = aL.pop();
      if (f === current_f) alive = false;
      for (var k=f.ip0; k<f.ip; k++) {
        var L = jitmap[k];
        var j = L.indexOf(f, L);
        L.splice(j, 1);
      }
      jitcode[f.ip0] = undefined;
    }
  }

  function jit() {
    var count = 0, code = "(function(){";
    var ip0 = ip, addr;
    var NN = 1; // was 2 meaning 2 got compiled in a row! "too clever" will give trouble for self-modifying code..l
    // HOWEVER: NN=5 reaches 2kips * 5 instructions a go, so it means 1 MIPS = 1 MHz...
    // so, this is still SLOW...
    // NN = 1 // I'm getting only 415 kips on 
    // Xiaomi Note 4A (2-3 years old...)
    // if done right, then there is no reason
    // why it would be slower than C!?!
    // TODO: generate massive SWITCH!
    // or array of instrunctions...
    while (count < NN) {
      count += 1;
      // magic? what instruction?
      if (m[ip] == 0x8D && special_write[addr=m[ip+1]+256*m[ip+2]]) {
        code += special_write[addr].name + "(a);\n";
        ip += 3;
      } else if (m[ip] == 0xAD && special_read[addr=m[ip+1]+256*m[ip+2]]) {
        code += "a="+special_read[addr].name+"();\n";
        ssz("a");
        ip += 3;
      } else {
        var op = opcodes[m[ip++]];
	//if (trace) console.log({op, ip, m: m[ip-1]});
        code += ops[op[0]](modes[op[1]]()) + "\n";
        if (jitstoppers.indexOf(op[0]) > -1)
          break;
      }
      if (count == NN)
        code += "ip=" + ip + ";";
    }
    code += fsz()+"})";
    var f = eval(code);
    //if (trace) console.log('\t', f.toString());

    for (var i=ip0; i<ip; i++) {
      var L = jitmap[i] = (jitmap[i] || []);
      L.push(f);
    }
    f.ip0 = ip0;
    f.ip = ip;
    f.alive = true;

    ip = ip0;

    return f;
  }

  var tickms = 50;
  var tCount = 0;
  var iCount = 0;
  var tTimems = 0;

  let NMI_VECTOR   = 0xfffa;
  let RESET_VECTOR = 0xfffc;
  let IRQ_VECTOR   = 0xfffe;

  let trace = false;

  // thisfunction runs tick
  function run(gotoip) {
    //console.log('run---------------------: ' + gotoip);
    if (gotoip && gotoip < 0) {
      if (run.timer)
	cancelTimeout(run.timer);
      else
	run.timer = undefined;
      return 'Stopped';
    }

    ip = gotoip || ip ||
      m[RESET_VECTOR] + m[RESET_VECTOR+1]*256;

    if (ip == 0) {
      if (run.timer)
	cancelTimeout(run.timer);
      else
	run.timer = undefined;
      return 'IP=0';
    } else {
      tCount++;
      var start = Date.now();
      var ms;
      while (ip != 0 && (ms = (Date.now() - start)) < tickms) {
        for (var k=0; ip && k<1000; k++) {
          alive = true; // this takes about 2% time

	  if (trace) {
	    let v= m[ip], op = opcodes[v];
	    console.log(
	      hex(4, ip),
	      op[0], op[1],
	      'a='+hex(2,a)+' x='+hex(2,x)+' y='+hex(2,y),
	      (s?'N':'_')+(v?'V':'_')+'_'+(b?'B':'_'),
	      (d?'D':'_')+(i?'I':'_')+(z?'Z':'_')+(c?'C':'_'),
	      'sp='+hex(2, sp),
	    );
	    if (typeof trace === 'function') {
	      if (ip > 0xc000)
		trace(ip.toString(16));
	      // operand (ok, not really right...)
	      let w = m[1]+m[2]*256;
	      // find a match interesting addresses!
	      if (w > 0xc000)
		trace(w.toString(16));
	    }
	  }

	  // TODO: jitcode big array lookup costs really alot we only get 425 KIPS instead of more
          (current_f=(jitcode[ip]||(jitcode[ip]=jit())))();
          //(jitcode[ip]||(jitcode[ip]=jit()))();

	  //console.log(current_f.toString());
	  iCount++;
	}
      }

      tTimems += ms;

      if (ip != 0)
	run.timer = setTimeout(run, 0);
    }
  }

  // return an interaction state object
  return {
    start(gotoip) {
      run(gotoip);
    },
    stop() {
      run(-1);
    },
    mem: m,
    regs() {
      return {
	a, x, y,
	ip, sp,
	// Carry, Zero, (sign)negative?, Decimal, oVerflow
	c, z, s, n: s, d, v, i,
      }
    },
    trace(st) { trace = st; },
    // f(data) {...}
    trapWrite(a, f) {
      special_write[a] = f;
    },
    // f() {... return 0..255 }
    trapRead(a, f) {
      special_reade[a] = f;
    },
    // allow it to run for ms each time
    setTickms(ms) {
      tickms = ms;
    },
    stats() {
      return {
	tCount, iCount, tTimems,
      };
    },
    // used by assmember and disassembler
    revopcodes,
    opcodes,
  };
}

const ORIC_ROM = './ROMS/BASIC V1.1B.rom';
const ROM_DOC  = './ROMS/v1.1_rom_disassemblys.html';

function ORIC() {
  const SCREEN = 0xbb80; // 48K
  //const SCREEN = 0x3b80; // 16K

  let cpu = cpu6502();
  let m = cpu.mem;

  // load ROM
  let fs = require('fs');
  let rom = fs.readFileSync(ORIC_ROM);
  if (!rom)
    throw 'ROM not loaded';
  if (rom.length !== 16384)
    throw 'ROM wrong size: ' + rom.length;

  // Load ROM doc
  let doc = fs.readFileSync(ROM_DOC, 'utf8');
  doc = doc
    .replace(/&#160;/g, ' ')
    .replace(/<br\/>/g, '\n')
    .replace(/\n+/g, '\n')
  
  ;
  // function that will print any mentions of
  // an address from the doc! lol
  function describe(addr) {
    doc.replace(
      RegExp(`\\n.*?${addr}.*?\\n.*?\\n.*?\\n.*?\\n`, 'ig'),
      txt=>{
	let disp = txt
	    .replace(/\n/g, '\t')
	    .replace(/^\s+/, '')
	    .replace(/xxx\t/g, '  ')
	    .replace(/  +/g, '  ')
	    .replace(/\t$/g, '')

	;
	
	if (!disp.match(/[0-9a-f]{4}[\s\n]*$/i)) {
	  // remove asm if it's same address
	  if (disp.match(RegExp('^'+addr, 'i')))
	    disp = disp.replace(/^.*\t/, '\t')

	  if (!disp.match(/^[A-Z0-9# \$\t\s\n]*$/))
	    console.log('\t'+disp);
	}
	return txt;
      });
  }
  
  m.set(rom, 0xc000);
  
  // run!

  cpu.trace(describe);
  let scon = false;
  //let scon = true;


  cpu.start();




  function puts(s) {
    process.stdout.write(s);
  }
  function putchar(c) {
    // wide characters
    // - https://www.fileformat.info/info/unicode/block/halfwidth_and_fullwidth_forms/list.htm
    // \uff00 = ! (i.e (ascii+ff00-32-1)
    // \uff21 = A
    // no space, use '  ' (two spaces)
    //
    // these won't do for oric, find replacement:
    // 126: ~ (ORIC: Shaded gray block)
    // 127: white paraenthesis (ORIC: black block)
    if (c < 32 || c > 127) 
      process.stdout.write(' ');
    else
      process.stdout.write(String.fromCharCode(c));
  }
  // xterm/ansi
  function cursorOff() { puts('[?25l'); }
  function cls() { puts('[2J'); gotorc(0,0); }
  function cursorOn() { puts('[?25h'); }
  function gotorc(r, c) { puts('['+r+';'+c+'H'); }

  let cursor = true;
  let n = 0;
  function updateScreen() {
    cursorOff();
    n++;
    if ((n % 20) == 1) cls();
    gotorc(0, 0);
    for(let r=0; r<28; r++) {
      puts('| ')
      for(let c=0; c<40; c++) {
	putchar(32);//m[SCREEN+r*40*c]);
      }
      puts(' |\n');
    }
    puts('\n\n)');
    gotorc(30, 0);
  }

  // simple monitor
  setInterval(function(){
    if (scon)
      updateScreen();
  
    let r = cpu.regs();
    let s = cpu.stats();
    let ips = Math.floor(s.iCount / s.tTimems);
    //console.log('\u000c', ips + ' kips', r, s);
    puts(
      '\n6502.js\t['+
	[Math.floor(s.iCount / s.tTimems), s.iCount, s.tTimems,
	 Math.floor(Math.log(s.iCount)/Math.log(10)+0.5)] + ']                 ');

    if (scon) {
      // position cursor
      gotorc(cpu.mem[0x28], cpu.mem[0x269]);

      // make it blink
      if (cursor) cursorOn(); else cursorOff();
      cursor = !cursor;
    }
  }, 200);
}

// from nodejs? 
if (typeof require !== 'undefined') {
  if (1) {
    ORIC();
  } else {
  let cpu = cpu6502();
  
  // TODO: move out!
  // TEST

  let mycode = 0x500; // can't start at 0!
  let a = mycode;
  cpu.mem[a++] = 0xe8; // INX
  cpu.mem[a++] = 0xe8; // INX
  cpu.mem[a++] = 0x88; // DEY
  cpu.mem[a++] = 0x88; // DEY
  cpu.mem[a++] = 0x4c; // JMP mycode
  cpu.mem[a++] = 0x00; //   00
  cpu.mem[a++] = 0x05; //   05

  function run(f) {
    [10, 20, 5, 100].forEach(z=>{
      console.log(f.name, z, '\t', f(z, cpu));
    });
  }
			     
  if (0) {
    run(fast6502);
    run(rom6502);
    run(romfunc6502);

    run(array6502);
    run(switch6502);
  }

  cpu.start(mycode);

  setInterval(function(){
    let r = cpu.regs();
    let s = cpu.stats();
    let ips = Math.floor(s.iCount / s.tTimems);
    //console.log('\u000c', ips + ' kips', r, s);
    console.log(
      '6502.js',
      [Math.floor(s.iCount / s.tTimems), s.iCount, s.tTimems,
       Math.floor(Math.log(s.iCount)/Math.log(10)+0.5)]);

  }, 1000);
}
}

// 10 MIPS only... (small hash 5 elts)
// 11 MIPS only... (256 array is slightly faster)
function array6502(M = 5, cpu) {
  var start = Date.now();

  var a, x, y, ip, z, s;
  let m = cpu.mem;
  ip = 0x500;

  let iCount = 0;

//  let hash = {}; // slower!
  let array = Array(256);

  function INX() {x=(x+1)&255;ip++;z=!x;s=x>127;iCount++;}
  function DEY() {x=(x+1)&255;ip++;z=!x;s=x>127;iCount++;}
  function JMP() {ip=m[ip+1]+m[ip+2]*256; iCount++;}

  array[0xe8] = INX;
  array[0x88] = DEY;
  array[0x4c] = JMP;

  for(iCount=0; iCount<M*1000*1000; ) {
    // ROM - no need to decode! hard-compile:
    //console.log('ip==', ip.toString(16));

    let i = m[ip];
    (array[i])();
  }

  let ms = Date.now()-start;

  return [Math.floor(iCount / ms), iCount, ms, Math.floor(Math.log(iCount)/Math.log(10)+0.5)]; // kips!
}

// 57 MIPS: function overhead is big! = 60 %
function romfunc6502(M = 5, cpu) {
  var start = Date.now();

  var a, x, y, ip, z, s;
  let m = cpu.mem;
  ip = 0x500;

  let iCount = 0;

  function p(x) { console.log(ip.toString(16), x); }

  function INX() {x=(x+1)&255;ip++;z=!x;s=x>127;iCount++;}
  function DEY() {x=(x+1)&255;ip++;z=!x;s=x>127;iCount++;}
  function JMP() {ip=m[ip+1]+m[ip+2]*256; iCount++;}

  for(iCount=0; iCount<M*1000*1000; ) {
    // ROM - no need to decode! hard-compile:
    //console.log('ip==', ip.toString(16));

    // HOW big switch can it handle?
    switch(ip) { // how clever is it?
    case 0x0500: INX();
    case 0x0501: INX();
    case 0x0502: DEY();
    case 0x0503: DEY();
    case 0x0504: JMP(); break;
    //case 0x5055: // ??? TOOD: compile random instruction!
      // Shit! This may not work for "too" clever coding, where variants of instructions are run, i.e. over for example data! in which case it may need to fall back...
      // safer: swtich over tointerpreter... :-(
      // There is the xample BIT addr that
      // can be used as SKIP2 bytes!
    default: console.log('ERROR AT: ip = ', ip, ip.toString(16)); iCount++;
    }
  }

  let ms = Date.now()-start;

  return [Math.floor(iCount / ms), iCount, ms, Math.floor(Math.log(iCount)/Math.log(10)+0.5)]; // kips!
}

// TODO: here's an idea: Compile the ROM
// to giant switch on addresses!!! LOL!
// (they can't very well self-modify...)
// 19 MIPS... mem access => 30x slow down :-(
// still promising...
//
// 89 MIPS! - half-ass good idea! but w caveat
function rom6502(M = 5, cpu) {
  var start = Date.now();

  var a, x, y, ip, z, s;
  let m = cpu.mem;
  ip = 0x500;

  let iCount = 0;

  function p(x) { console.log(ip.toString(16), x); }

  for(iCount=0; iCount<M*1000*1000; ) {
    // ROM - no need to decode! hard-compile:
    //console.log('ip==', ip.toString(16));

    // HOW big switch can it handle?
    switch(ip) { // how clever is it?
    case 0x0500: x=(x+1)&255;ip++;z=!x;s=x>127;iCount++; // INX
    case 0x0501: x=(x+1)&255;ip++;z=!x;s=x>127;iCount++; // INX
    case 0x0502: y=(y-1)&255;ip++;z=!y;s=y>127;iCount++; // DEY
    case 0x0503: y=(y-1)&255;ip++;z=!y;s=y>127;iCount++; // DEY
    case 0x0504: ip=m[ip+1]+m[ip+2]*256; iCount++; break; // JMP
    //case 0x5055: // ??? TOOD: compile random instruction!
      // Shit! This may not work for "too" clever coding, where variants of instructions are run, i.e. over for example data! in which case it may need to fall back...
      // safer: swtich over tointerpreter... :-(
      // There is the xample BIT addr that
      // can be used as SKIP2 bytes!
    default: console.log('ERROR AT: ip = ', ip, ip.toString(16)); iCount++;
    }
  }

  let ms = Date.now()-start;

  return [Math.floor(iCount / ms), iCount, ms, Math.floor(Math.log(iCount)/Math.log(10)+0.5)]; // kips!
}


// 19 MIPS... mem access => 30x slow down :-(
// still promising...
function switch6502(M = 5, cpu) {
  var start = Date.now();
  var iCount = 0;

  var a, x, y, ip, z, s;
  let m = cpu.mem;
  ip = cpu.regs().ip;

  for(let k=0; k<M*1000*1000; k++) {
    iCount++;
    let i = m[ip++];
    switch(i){
    case 0xe8: // INX
      x=(x+1)&255;ip++;z=!(x);s=((x)>127); break;
    case 0x88: // DEY
      y=(y-1)&255;ip++;z=!(y);s=((y)>127); break;
    case 0x4c: // JMP
      ip=m[ip++]+m[ip++]*256; break;
    }
  }

  let ms = Date.now()-start;

  return [Math.floor(iCount / ms), iCount, ms, Math.floor(Math.log(iCount)/Math.log(10)+0.5)]; // kips!
}

// 590 MIPS... memory-less machine! "compiled"
function fast6502(M = 5) {
  var start = Date.now();
  var iCount = 0;

  var a, x, y, ip, z, s;
  ip = 1280;
  for(let k=0; k<M*1000*1000; k++) {
    // INX
    x=(x+1)&255;ip=1281;z=!(x);s=((x)>127);
    iCount++;
    // INX
    x=(x+1)&255;ip=1282;z=!(x);s=((x)>127);
    iCount++;
    // DEY
    y=(y-1)&255;ip=1283;z=!(y);s=((y)>127);
    iCount++;
    // DEY
    y=(y-1)&255;ip=1284;z=!(y);s=((y)>127);
    iCount++;
    // JMP $0500
    ip=1280;
    iCount++;
  }
  let ms = Date.now()-start;

  return [Math.floor(iCount / ms), iCount, ms, Math.floor(Math.log(iCount)/Math.log(10)+0.5)]; // kips!
}
