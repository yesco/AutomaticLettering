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

function hex(n,x) {
  var r = "";
  for (var k=0; k<n; k++) {
    r = "0123456789ABCDEF"[x & 15] + r;
    x >>= 4;
  }
  return r;
}

// var is faster than let! about 5%! 20200730
function cpu6502() {
  // Note: special read/write only works for LDA/STA absolute

  // The original author only handled special DIRECT ABSOLUTE address and only A!!!! :-(
  // ignores zero page...
  // LDA, LDX, LDY
  // STA, LDX, LDY
  // LD? $xxxx        ! only handled for A
  // LD? ($xxxx,x)    ! not for indirect x
  // LD? ($xxxx),y    ! not for indirect y
  //
  // bad code that doesn't tell limitiations.

  // key=address, value=function(data){...}
  var special_write = { };

  // key=address, value=function(){...}
  var special_read = { };

  // Virtual CPU ////////////////////////////////////////////////////////

  var m = new Uint8Array(65536);
  m.fill(0);

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

  // return stack as hex string reverse order
  // (starting at FF--sp
  function stack() {
    let r = '';
    for(let k=sp+1; k<=0xff; k++) {
      r += hex(2, m[0x100 + k]) + ' ';
    }
    return r;
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
    iix() { var z=m[ip++]; return "m[m[("+z+"+x)&255]+(m[("+(z+1)+"+x)&255]<<8)]"; },
    iiy() { var z=m[ip++]; return "m[(m["+z+"]+(m["+((z+1)&255)+"]<<8)+y)&65535]"; },
    rel() { var delta=m[ip++]; if(delta>=128)delta-=256; return ""+((ip+delta)&65535); },
    adr() { ip+=2; return ""+(m[ip-2]+(m[ip-1]<<8)); },
    ind() { var z=m[ip]+m[ip+1]*256; ip+=2; return "m["+z+"]+(m["+((z+1)&65535)+"]<<8)"; },
    acc() { return "a"; },
  };

  // prettyprint mode for instruction at ip
  var ppmodes = {
    ___(ip)  { return [0, ""]; }, // jsk
    imm(ip)  { return [1, "#$" + hex(2,m[ip])]; },
    zpg(ip)  { return [1, "$" + hex(2,m[ip])]; },
    zpx(ip)  { return [1, "$" + hex(2,m[ip]) + ",x"]; },
    zpy(ip)  { return [1, "$" + hex(2,m[ip]) + ",y"]; },
    abs(ip)  { return [2, "$" + hex(4,m[ip]+m[(ip+1)&65535]*256)]; },
    abx(ip)  { return [2, "$" + hex(4,m[ip]+m[(ip+1)&65535]*256) + ",x"]; },
    aby(ip)  { return [2, "$" + hex(4,m[ip]+m[(ip+1)&65535]*256) + ",y"]; },
    iix(ip)  { return [1, "($" + hex(2,m[ip]) + ",x)"]; },
    iiy(ip)  { return [1, "($" + hex(2,m[ip]) + "),y"]; },
    rel(ip)  { var delta = m[ip]; if (delta>=128) delta-=256; return [1, "$" + hex(4,ip+1+delta)]; },
    adr(ip)  { return [2, "$" + hex(4,m[ip]+m[ip+1]*256)]; },
    ind(ip)  { return [2, "($" + hex(4,m[ip]+m[ip+1]*256) + ")"]; },
    s_acc(ip)  { return [0, "a"]; },
  };

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
	     fsz()+"m[256+sp]="+((ip-1)&255)+";m[256+((sp-1)&255)]="+((ip-1)>>8)+";sp=(sp-2)&255;"+
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
    iny(m) { ssz("y"); return "y=(y+1)&255;"; },
    jmp(m) { return fsz()+"ip="+m+";"; },
    jsr(m) { return fsz()+"m[256+sp]="+((ip-1)>>8)+";m[256+((sp-1)&255)]="+((ip-1)&255)+";sp=(sp-2)&255;ip="+m+";return;"; },
    lda(m) { ssz("a"); return "a="+m+";"; },
    ldx(m) { ssz("x"); return "x="+m+";"; },
    ldy(m) { ssz("y"); return "y="+m+";"; },
    lsr(m) { ssz(m); return "c="+m+"&1;"+m+">>=1;"; },
    nop(m) { return ""; },
    ora(m) { ssz("a"); return "a|="+m+";"; },
    pha(m) { return "m[256+sp]=a;sp=(sp-1)&255;"; },
    php(m) { return "m[256+sp]=SR();sp=(sp-1)&255;"; },
    pla(m) { ssz("a"); return "sp=(sp+1)&255;a=m[256+sp];"; },
    plp(m) { return "sp=(sp+1)&255;setSR(m[256+sp]);"; },

    rol(m) { ssz(m); return "w="+m+";"+m+"=((w<<1)+c)&255;c=(w>127);"; },
    ror(m) { ssz(m); return "w="+m+";"+m+"=((w>>1)+(c<<7));c=(w&1);"; },
    rti(m) { return ops.plp(m)+ops.rts(m)+"i=0;"; },
    rts(m) { return fsz()+"ip=(m[256+((sp+1)&255)]+(m[256+((sp+2)&255)]<<8)+1)&65535;sp=(sp+2)&255;"; }, // stack grew wrong direction in original!
    sbc(m) { ssz("w"); return "w=a-"+m+"-(1-c);c=(w>=0);v=((a&0x80)!=(w&0x80));a=(w&255);"; },
    sec(m) { return "c=1;"; },
    sed(m) { throw "Not implemented"; },
    sei(m) { return "i=1;"; },
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

  // TOOD: i doesn't seem to be reset by rti ????
  function doBrk() {
    // ignore if already in interrupt!

    // TODO: could disable, but creash earlier!
    if (i) return false;
    
    // TOOD: i doesn't seem to be reset by rti ????

    // "jsr" but go to different address
    // - save ip to stack
    m[256+sp]=((ip-1)&255);
    m[256+((sp-1)&255)]=((ip-1)>>8);
    sp=(sp-2)&255;
    // save SR
    m[256+sp]=SR();sp=(sp-1)&255;

    setSR(0);
    i=1; // rti will clear!
    ip=m[IRQ_VECTOR]+m[IRQ_VECTOR+1]*256;

    return true; // saying it was successful
    // it'll be run at next tick...
  }

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

    while (count < NN) {
      count += 1;

      // The original author only handled special DIRECT ABSOLUTE address and only A!!!! :-(
      // ignores zero page...
      // LDA, LDX, LDY
      // STA, LDX, LDY
      // LD? $xxxx        ! only handled for A
      // LD? ($xxxx,x)    ! not for indirect x
      // LD? ($xxxx),y    ! not for indirect y
      //
      // bad code that doesn't tell limitiations.
      if (m[ip] == 0x8D && special_write[addr=m[ip+1]+256*m[ip+2]]) {
	// STA $xxxx (ignores zeropage)
        code += special_write[addr].name + "(a);\n";
        ip += 3;
      } else if (m[ip] == 0xAD && special_read[addr=m[ip+1]+256*m[ip+2]]) {
	// LDA $xxxx (ignore zeropage)

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
    var f;
    try {
      f = eval(code);
    } catch(e) {
      throw Error(e + '\n' + code);
    }
    if (trace) console.log('\t', f.toString());

    for (var k=ip0; k<ip; k++) {
      var L = jitmap[k] = (jitmap[k] || []);
      L.push(f);
    }
    f.ip0 = ip0;
    f.ip = ip;
    f.alive = true;

    ip = ip0;

    return f;
  }

  var tickms = 50;
  var step = 1000;
  var maxstep = 1000*1000;
  var delay = 0;

  var tCount = 0;
  var iCount = 0;
  var tTimems = 0;

  let NMI_VECTOR   = 0xfffa;
  let RESET_VECTOR = 0xfffc;
  let IRQ_VECTOR   = 0xfffe;

  let trace = false;
  let error = defaultError;

  function defaultError(e) {
    throw e;
  }

  // error-catching wrapper
  function run(gotoip) {
    try {
      return irun(gotoip);
    } catch(e) {
      error(e);
    }
  }

  let nextip = 0;

  // thisfunction runs tick
  function irun(gotoip) {
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
      var istart = iCount;
      while (ip != 0 && (ms = (Date.now() - start)) < tickms) {
	if (iCount - istart > maxstep) break;

        for (var k=0; ip && k<step; k++) {
          alive = true; // this takes about 2% time

	  // disassemble!
	  // AAAA JSR $8400 a=00 x=ff y=12 NV_B DIZC sp=fa ( 11 22 33 44 55 )
	  if (trace && ((typeof trace !== 'function') || ((typeof trace == 'function') && trace(ip))))
 {
	    if (ip != nextip)
	      console.log('---->');

	    let v= m[ip], op = opcodes[v];
	    let farg = ppmodes[op[1]], arg = '???';
            // save to detect jmp/jsr
	    nextip = ip + 1;
	    if (farg) {
	      let z;
	      [z, arg] = farg(ip+1);
	      nextip += z;
	    }
	    console.log(
	      hex(4, ip),
	      op[0], arg.padEnd(9, ' '),
	      'a='+hex(2,a)+' x='+hex(2,x)+' y='+hex(2,y),
	      (s?'N':'_')+(v?'V':'_')+'_'+(b?'B':'_'),
	      (d?'D':'_')+(i?'I':'_')+(z?'Z':'_')+(c?'C':'_'),
	      'sp='+hex(2, sp)+'( '+stack()+')',
	    );
	    if (typeof trace === 'function') {
	      if (ip > 0xc000)
		trace(ip.toString(16), 1);
	      else 
		trace(ip.toString(16), 2);
	      // operand (ok, not really right...)
	      if (arg)
		trace(arg, 3, x, y);
	      let w = m[1]+m[2]*256;
	      // find a match interesting addresses!
	      if (w > 0xc000)
		trace(w.toString(16), 4);
	    }
	  }

	  // TODO: jitcode big array lookup costs really alot we only get 425 KIPS instead of more

	  // disable keeping jit-shit!
	  // (zero page isn't handled?)
          if (1) {
	    (current_f=(jitcode[ip]||(jitcode[ip]=jit())))(); 
	  } else {
            (current_f=jit())();
	  }

          //(jitcode[ip]||(jitcode[ip]=jit()))();

	  //console.log(current_f.toString());
	  iCount++;
	}
      }

      tTimems += ms;

      if (ip != 0)
	if (run.timer) return;
	run.timer = setInterval(run, delay);
	//run.timer = setTimeout(run, delay);
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
    // simulate hardware interrupt!
    // returns true if interrupt enabled
    irq() {
      return doBrk(); // same as brk!
    },
    // simulate hardware interrupt!
    nmi() {
      throw 'NMI: not implemented!';
    },
    // simulate hardware interrupt!
    rst() {
      throw 'RST: not implemented!';
    },
    setError(errf) {
      error = errf || defaultError;
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
    // st: undefined/false/true
    // st: function(arg) {
    //   arg: number, return true if to show trace
    //   arg: string, search and describe,
    //        typically called with 'ADDR'
    trace(st) { trace = st; },
    // f(data) {...}
    trapWrite(a, f) {
      special_write[a] = f;
    },
    // f() {... return 0..255 }
    trapRead(a, f) {
      special_reade[a] = f;
    },
    // ms: run for max ms each tick (30)
    // stp: steps(instructions) per go (1000)
    // mxstp: maxsteps per tick (loose) (1M)
    // dly: delay before running next time (0)
    setTickms(ms, stp, mxstp, dly) {
      tickms = ms | ms;
      maxstep = mxstp || maxstep;
      step = stp || step;
      step = Math.min(step, maxstep);
      delay = dly;
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
const ORIC_CORE = './oric.core';

const PANDORIC = './pandoric.fun';

function ORIC(dorom) {
  let startAddr; // if not set, RESET

  let fs = require('fs');

  // init 6502
  let cpu = cpu6502();
  let m = cpu.mem;

  cpu.setError(oricError);

  function oricError(e) {
    off();
    cursorOn();
    gotorc(50, 0);
    console.error('----------- EXIT ----------');
    console.error('ERROR: ', e);
    console.error('Registers:');
    console.error(cpu.regs());
    console.error('Stats:');
    console.error(cpu.stats());
    console.error('...memory dumped to file: ' + ORIC_CORE);
    console.error('(tip: hexdump -C oric.core)');

    fs.writeFileSync(ORIC_CORE, m);
    fs.appendFileSync(ORIC_CORE, '\n========= REGS & STATS ========\n');
    fs.appendFileSync(ORIC_CORE, 'ERROR: ' + e);
    fs.appendFileSync(ORIC_CORE, JSON.stringify(cpu.regs())+'\n');
    fs.appendFileSync(ORIC_CORE, JSON.stringify(cpu.stats())+'\n');
    process.exit(1);
  }

  function exitHandler(options, exitCode) {
    if (options.exit) {
      oricError('ExitCode: ' + exitCode);
      process.exit();
    }
  }

  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, {exit:true}));

/* ORIC, timer load:

// wow - so clumsy!!!

$272,$273 Keyboard timer. 
$274,$275 Cursor timer. 

- INTERRUPTS
Name	 		V1.0	V1.1
Start  6522 Clocks	#ECC7	#EDE0
Stop  6522 clocks	#ED01	#EE1A
Update timers etc	#ED1B	#EE34
Clear all timers	#ED70	#EE8C
Read a timer into X Y 	#ED81	#EE9D
Write XY into a timer	#ED8F	#EEAB
Wait for time X Y	#EDAD	#EEC0 ???
Reset                            F9aa

F9AA LDA #$FF 	RESET 6522.
F9AC STA $0303 	Port A all output. 
  ($303) = ff
F9AF LDA #$F7 	Port B all output except 
F9B1 STA $0302 	bit 4. 
  ($302) = f7   ( ff - 8)
F9B4 LDA #$B7 	Turn off cassette motor. 
F9B6 STA $0300 
  ($d300) = b7
F9B9 LDA #$DD 	Set CA2 and CB2 to 0 and set 
F9BB STA $030C 	CA1 and CB1 active L to H. 
  ($30c) = dd
F9BE LDA #$7F 
F9C0 STA $030E 	Disable all interrupts. 
  ($30e) = 7f
F9C3 LDA #$00 
F9C5 STA $030B 	Set the ACR. 
  ($308) = 00  
F9C8 RTS 

EDE0 PHA	This routine sets the three 16
  push a
EDE1 JSR $EE8C	bit counters (#272/3, #274/5 & 
  jsr clearTimers
EDE4 LDA #$00	#276/7) after setting them to 
  a = 00
EDE6 LDX #$00	zero. 
  x = 00
EDE8 LDY #$03	#272/3 is set to 3 and is used 
  y = 03
EDEA JSR $EEAB	as a counter for keyboard 
  jsr writeXYtoTimerA
EDED LDA #$01	scanning. #274/5 is set to 25 
  a = 01
EDEF LDY #$19	and is used as a counter for 
  y = 19
EDF1 JSR $EEAB	toggling the cursor. #276/7 is 
  jsr writeXYtoTimerA
EDF4 LDA #$00	not set here but is used in 
EDF6 STA $0271	the WAIT command. 
  ($271) = 00

EDF9 LDA $030B 
  a = ($30b)
EDFC AND #$7F	This section sets up the 6522 
EDFE ORA #$40 	to generate interrupts from
EE00 STA $030B 	timer 1 every 10ms (in its 
  ($30b) = (a & 7f) | 40
EE03 LDA #$C0 	free running mode).
EE05 STA $030E 
  ($30e) = a = c0
EE08 LDA #$10 
EE0A STA $0306 
EE0D STA $0304 
  ($304) = ($306) = a = 10
EE10 LDA #$27 
EE12 STA $0307 
EE15 STA $0305 
  ($305) = ($307) = a = 27
EE18 PLA 
  pull a
EE19 RTS
  return

via6552: IRQ every 10ms (free running mode)
  ($30b) = (a & 7f) | 40
  ($30e) = a = c0
  ($304) = ($306) = a = 10
  ($305) = ($307) = a = 27

EE1A PHA 	Disable timer 1 interrupts
EE1B LDA #$40 	from the 6522. This routine 
EE1D STA $030E 	is used by the cassette 
EE20 PLA commands. 
EE21 RTS 

EE22 PHA 	IRQ Handler.
EE23 LDA $030D	Test that timer 1 has timed
  a = ($30d)
EE26 AND #$40	out; if so then go to service 
  a = a & 40
EE28 BEQ $EE30	subroutine. The interrupt 
  if not (bit 6 is set) skip till ee30 (pla)
EE2A STA $030D	routine is terminated by 
  ($30d) = a
EE2D JSR $EE34	jumping to the RTI instruction 
  
---> ( 6th bit not set)
EE30 PLA 	at #24A. 
EE31 JMP $024A 
  user interrupt handler, init: RTI !

EE34 PHA 	update clocks
EE35 TXA 
EE36 PHA 
EE37 TYA 
EE38 PHA 
EE39 LDY #$00 	This section decrements each 
EE3B LDA $0272,Y of the three 16 bit counters 
EE3E SEC in page 2 by 1. 
EE3F SBC #$01 
EE41 STA $0272,Y 
EE44 INY 
EE45 LDA $0272,Y 
EE48 SBC #$00 
EE4A STA $0272,Y 
EE4D INY 
EE4E CPY #$06 
EE50 BNE $EE3B 
EE52 LDA #$00 	Load X (high) and Y (low) with 
EE54 JSR $EE9D 	content of first counter. If 
EE57 CPY #$00 	has reached zero then reload 
EE59 BNE $EE6B 	it with the value of 3. 
EE5B LDX #$00 
EE5D LDY #$03 
EE5F JSR $EEAB 	After each countdown to zero 
EE62 JSR $F495 	strobe the keyboard; the 
EE65 TXA result will be in X and bit 7 
EE66 BPL $EE6B 	set if a valid key. 
EE68 STX $02DF 	Save the new key. 
EE6B LDA #$01 	Load X and Y with content of 
EE6D JSR $EE9D 	the second 16 bit counter. If 
EE70 CPY #$00 	it has reached zero then 
EE72 BNE $EE86 	reload it with the value of 
EE74 LDX #$00 	25. When zero, toggle the 
EE76 LDY #$19 	cursor flag in #271. 
EE78 JSR $EEAB 	Then place a copy of cursor
EE7B LDA $0271 	on screen if it is enabled.
EE7E EOR #$01 
EE80 STA $027
EE83 JSR $F801 
EE86 PLA 
EE87 TAY 
EE88 PLA 
EE89 TAX 
EE8A PLA 
EE8B RTS 

EE8C PHA 	This routine sets to zero 
EE8D TYA 	the three 16 bit counters 
EE8E PHA 	at #272/3, #274/5 and #276/7. 
EE8F LDY #$05 
EE91 LDA #$00 
EE93 STA $0272,Y 
EE96 DEY 
EE97 BPL $EE93 
EE99 PLA 
EE9A TAY 
EE9B PLA 
EE9C RTS 
EE9D PHA 	This routine loads X (high) 
EE9E ASL 	A and Y (low) with the content 
EE9F TAY 	of the 16 bit counter 
EEA0 SEI 	specified by the content of A. 
EEA1 LDA $0272,Y The valid values of A are 0, 1 
EEA4 LDX $0273,Y and 2 which load the 1st, 2nd 
EEA7 CLI 	and 3rd counters respectively. 
EEA8 TAY 
EEA9 PLA 
EEAA RTS 
EEAB PHA 	This routine loads the 16 bit 
EEAC TXA 	counter specified by A with 
EEAD PHA 	the contents of X (high) and 
EEAE TYA Y 	(low). 
EEAF PHA 	Values of 0, 1 and 2 in A 
EEB0 TSX 	access the 1st, 2nd and 3rd 
EEB1 LDA $0103,X counters respectively. 
EEB4 ASL A 
EEB5 TAY 
EEB6 PLA 
EEB7 PHA 
EEB8 SEI 
EEB9 STA $0272,Y 
EEBC LDA $0102,X 
EEBF STA $0273,Y 
EEC2 CLI 
EEC3 PLA 
EEC4 TAY 
EEC5 PLA 
EEC6 TAX 
EEC7 PLA 
EEC8 RTS 
EEC9 JSR $EEAB 	Load the 16 bit counter 
EECC JSR $EE9D 	specified by A with the 
EECF CPY #$00 	contents of X and Y and then 
EED1 BNE $EECC	wait until that counter has 
EED3 CPX #$00 	decremented to zero. 
EED5 BNE $EECC 
EED7 RTS 

*/

  // ---------------------------- SCREEN
  const SCREEN = 0xbb80; // 48K
  //const SCREEN = 0x3b80; // 16K

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
   
    if (c == 0) {
      process.stdout.write('0');
    } else if (c > 127) {
      //inverseOn();
      putchar(c & 127);
      //off();
      // TODO: restore last fg/bg/blink/double?
    } else if (c < 32) {
      if (c < 8) {
	fgcol(c);
      } else if (c < 16 || c >= 24) {
	boldOn();
	putchar(c + 64);
	off();
	// TODO: restore fg/bg/blink/double?
      } else if (c < 24) {
	bgcol(c - 16);
      }
    } else if (c == 32) {
      process.stdout.write(' ');
    } else if (c) {
      //process.stdout.write('P'); return;
      process.stdout.write(String.fromCharCode(c));
      //process.stdout.write('['+c+']');
    } else {
      // undefined?
      process.stdout.write('['+c+']');
    }
  }
  // xterm/ansi
  function cursorOff() { puts('[?25l'); }
  function cls() { puts('[2J'); gotorc(0,0); }
  function cursorOn() { puts('[?25h'); }
  function gotorc(r, c) { puts('['+r+';'+c+'H'); }
  function fgcol(c) { puts('[3'+c+'m@'); } // add teletext space
  function bgcol(c) { puts('[4'+c+'m@'); } // add teletext space
  function inverseOn() { puts('[7m'); }
  function underscoreOn() { puts('[4m'); }
  function boldOn() {  puts('[1m'); }
  // you can only turn all off! :-(
  function off(){ puts('[m'); }

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
	putchar(m[SCREEN+r*40+c]);
      }
      off();
      puts(' |\n');
    }
    puts('\n');
    gotorc(29, 0);
  }

  // define functions
  function fun(name, body) {
    let a = fun[name] = fun.nextAddr, start = a;
    fun[a] = name;
    // TODO: change
    fun.nextAddr += 256;
    body = body.forEach(
      (b,i)=>{
	process.stdout.write(`\t${name} ${i} ${b} ${a-start} `);
	if (!b) return;
	let v = parseInt(b, 16);
	// TOOD: require $ prefix for hex?
	if (v.toString(16) !== b.toLowerCase() && b[0] != '0')
	  v = undefined;
	// TODO: spaces inside strings...
	if (b[0] === '"') {
	  // zero terminated string
	  let i = 0;
	  while(i<b.length && (m[a++] = b.charCodeAt(++i)) !== '"')
	    console.log('= '+hex(2, m[a-1]));

	  a--;
	  m[a-1] = 0;
	  console.log('= '+hex(2, m[a-1]));
	} else if (b[0] === "'") {
	  // char code (7 bit)
	  m[a++] = b.charCodeAt(1);
	} else if (b.length === 4 && v > 0) {
	  // 4 char hexcode address, little endian
	  console.log('= '+hex(4, v));
	  m[a++] = v % 256
	  m[a++] = v >> 8;
	} else if (v < 256) {
	  // 2 char hexcode
	  console.log('= '+hex(2, v));
	  m[a++] = v;
	} else {
	  // symbol/name (make jsr)
	  let to = fun[b], op;
	  if (!to) {
	    op = b[0];
	    to = b.substr(1);
	    to = fun[to] || parseInt(to, 16);
	  }
	  if (!to) throw Error('In "'+name+'" do not know "'+b+'"');

	  switch(op) {
	  case '*': { // relative
	    let d = to - a - 1;
	    console.log(' d='+d);
	    if (d < -128 || d > 127)
	      throw Error('Relative out of byte range!');
	    if (d < 0) d += 256;
	    console.log(' d='+d);
	    console.log('= '+hex(2, d));
	    m[a++] = d;
	    break; }
	  case '^': // hi-byte
	    to = to >> 8;
	    console.log('= '+hex(2, to));
	    m[a++] = to;
	    break;
	  case '_': // lo-byte
	    to = to % 256;
	    console.log('= '+hex(2, to));
	    m[a++] = to;
	    break;
	  case undefined: // default
	    process.stdout.write(' JSR ');
	    m[a++] = 0x20; // jsr
	    // fall through
	  case '&': // address
	    console.log('= '+hex(4, to));
	    m[a++] = to % 256
	    m[a++] = to >> 8;
	    break;
	  default:
	    throw Error("Unknown op='"+op+"' of '"+b+"' to='"+to+"' ...");
	    
	  }
	}
      });
    // change last jsr+rts to jmp!
    if (m[a-2] === 0x20) {
      m[a-2] = 0x4c; // jmp
    } else {
      m[a++] = 0x60; // rts
    }
    console.log('-->' + start.toString(16).padStart(4, '0') + ' len='+(a-start));
    return start;
  }

  // TODO: change
  fun.nextAddr = 0x601; // after basic

  let describe;

  if (dorom === 'rom') {
    // load ROM
    let rom = fs.readFileSync(ORIC_ROM);
    if (!rom)
      throw 'ROM not loaded';
    if (rom.length !== 16384)
      throw 'ROM wrong size: ' + rom.length;

    m.set(rom, 0xc000);

    // Load ROM doc
    let doc = fs.readFileSync(ROM_DOC, 'utf8');
    doc = doc
      .replace(/&#160;/g, ' ')
      .replace(/<br\/>/g, '\n')
      .replace(/\n+/g, '\n')
    
    ;
    // doc line per address
    let adoc = {};
    doc.replace(/\n([0-9A-F]{4})\b.*?\n.*?\n.*?\n.*?\n/g, (a,addr)=>{
      //console.log(addr);
      if (a.match(/\n[0-9A-F,\(\)\$# \s\n]{4,}$/))return;
      addr = addr.toLowerCase();
      //a = a.replace(/^\n(.*?)\n(.*?)\n[A-Z]{3} [0-9A-FXY,\(\)]+ \n/, '');
      a = a.replace(/^\n(.*?)\n(.*?)\n[A-Z]{3} [\s\S]*?\n/, '')
	.replace(/[\n\t\s]+/g, ' ')
	.trim();

      if (!a) return;
      //a = a.replace(/\t/g, '\\t');
      //a = a.replace(/ /g, '\\ ');
      //a = a.replace(/\n/g, '\\n');
      adoc[addr] = (adoc[addr] || '') + '\t\t'+ a + '\n';
    });
    // Xref
    if (1)
      doc.replace(/\n[0-9A-F]{4} \n.+?\n.+?\$([0-9A-F]{4})\b.*?\n.*?\n/g, (a,addr)=>{
	//console.log(addr);
	a = a.replace(/[\n\t\s]+/g, ' ')
	  .trim()
	;
	if (!a) return;
	addr = addr.toLowerCase();
	adoc[addr] = (adoc[addr] || '') + '\t\t\tXREF: ' + a + '\n';
      });

    // process.exit(1);

    // function that will print any mentions of
    // an address from the doc! lol
    describe = function(descaddr, mode) {
      // used to exclude logging of some addresses!
      // (like wait loops!)
      if (typeof addr == 'number') {
	// addresses/rnages we don't want to see
	if (addr >= 0xee9d && addr <= 0xeed1) return;

	// yes! we want trace of this address
	return true;
      }

      // actual describe
      if (mode === 1 || mode === 2) {
	// ip
	let d = adoc[addr];
	if (d) console.log('\t'+d);
	return;
      } else if (mode === 3) {
	// arg
	console.log('\t@'+addr);
	return;
      }
    }
  } // rom
  else {
    // no rom, just "screen hardare"
    let t = 'PANDORIC';
    //for(let i=0; i<t.length; i++)
    //m[SCREEN+40-t.length+i] = t.charCodeAt(i);
    let f = fs.readFileSync(PANDORIC, 'utf8');
    // remove comments in ()
    f = f.replace(/\([\s\S]*?\)/g, ' ');
    // extract '=' alias
    let alias = {};
    f = f.replace(/=\s*(\S+)([\s\S]*?);/g, (a,f,l)=>{
      //console.log('SUBST: '+f+ ' line: '+l);
      // call last fun defined
      alias[f] = l.trim();;
      return '';
    });

    // replace now (now subst inside?)
    // (reverse to match longest first1
    Object.keys(alias).sort().reverse().forEach(
      n=>f=f.replace(RegExp('(?<![A-Za-z])'+n+'(?![\\w#])', 'g'), alias[n]));

    // extract functions
    f = f.replace(/:\s*(\S+)([\s\S]*?);/g, (a,f,l)=>{
      console.log('FUNCTION: '+f+ ' line: '+l);
      // call last fun defined
      fun(f, l.trim().split(/\s+/));
      return '';
    });
    
    startAddr = fun.reset || fun.main;
    //process.exit(33);

    if (0) {
      describe = function(){return  42;};
    } else {
      describe = 
	function desc(a, mode, x, y){
	  if (typeof addr == 'number') return true;
	  let v = parseInt(a, 10);
	  if (mode === 1 || mode === 2) {
	    if (fun[v])
	      console.log('====> ', fun[v]);
	  } else if (mode === 3) {
	    // arg
	    if (a[0] === '#') return true;
	    console.log('\t@'+a, x, y);
	    a.replace(/\$([0-9a-fA-F]+)/, (_,aa)=>v=parseInt(aa, 16));
	    a.replace(/,X/,()=>v+=x);
	    a.replace(/(?<!\(),Y/,(aa)=>v+=y);
	    console.log('\t=>@'+hex(4, v));
	    a.replace(/\(/,(aa)=>v=m[v]+(m[v+1]<<8));
	    a.replace(/\),Y/,(aa)=>v+=y);
	    console.log('\t=>@'+hex(4, v));
	    if (m[a])
	      console.log((m[a].toString(16).padStart(2, '0')));
	  }
	  return true;
	}
    }
  }

  // run!

  let scon = false;
  scon = true;
  if (!scon)
    cpu.trace(describe);
  
  // 6555 via cheat:
  let page3 = new Uint8Array(256);
  page3.fill(0);

  // TODO: cost of this?
  // TODO: we only care about few addresses?
  let intCount = 0;
  let lastiCount = 0;
  let viaInterval = setInterval(()=>{
    // simulated time ~ 10ms (4500 instructions?)
    // (/ (/ 1M 2) 100) 'ish
    let iC = cpu.stats().iCount;
    if (iC-lastiCount < 4500) {
      return;
    }
    lastiCount = iC;

    // ($30e) = 7f 'Disable all interrupts. 

    // disabled
    if (m[0x30e] == 0x7f) {
      //console.error("Interrupts disabled");
      return;
    }
    // enabled (?)
    // TODO: check what bit?
    if (m[0x30e] != 0xc0) return;

    //console.error("Interrupts enabled");

    // F9aa RESET 6522
    // ($303) = ff 'Port A is all output
    // ($302) = ff-8 'Port B all output except 
    // ($d300) = b7 'Turn off cassette motor. 
    // ($30c) = dd '
    // 		Set CA2 and CB2 to 0 and set 
    //  	CA1 and CB1 active L to H. 
    // ($30e) = 7f 'Disable all interrupts. 
    // ($308) = 00 'Set ACR (?)
    // RTS

    // IRQ Handler.
    // Test that timer 1 has timed
    // out; if so then go to service 
    // subroutine. The interrupt
    // if not (bit 6 is set) skip till ee30
    // routine is terminated by
    // jumping to the ram RTI (user changeable!)
    //
    // EE22 PHA 	 IRQ Handler
    // EE23 LDA $030D	
    //   a = ($30d)
    // EE26 AND #$40	
    //   a = a & 40
    // EE28 BEQ $EE30	
    // EE2A STA $030D	
    //  ($30d) = a
    // EE2D JSR $EE34	
    //
    // ---> ( 6th bit not set)
    // EE30 PLA 	at #24A. 
    // EE31 JMP $024A 
    //   user interrupt handler, init: RTI !

    m[0x30d] |= 0x40; // set 'interrupt happened'

    // simulate timer interrupt
    if (cpu.irq())
      intCount++;

    // TOOD: for now, ignore this stuff!
    return;
/*
via6552: IRQ every 10ms (free running mode)
  a = ($30b)
  ($30b) = (a & 7f) | 40
  ($30e) = a = c0
  ($304) = ($306) = a = 10    '10 ms
  ($305) = ($307) = a = 27    '////
*/
    // compare m with page3
    for (let i=0; i<256; i++) {
      if (m[i+0x300] !== page3[i]) {
	// update copy
	page3[i] = m[i+0x300];
      }
    }
    // 

  }, 10); // call "every 10ms"


  // don't set more time than 10ms!
  //setTickms(ms, stp, mxstp, dly)
  //cpu.setTickms(10, 1, 1, 1);
  cpu.start(startAddr); 

  // simple monitor
  setInterval(function(){

      // TODO: *0x030b = 40; // generate timer interrupts every 10ms

    if (scon)
      updateScreen();
  
    let r = cpu.regs();
    let s = cpu.stats();
    let ips = Math.floor(s.iCount / s.tTimems);
    //console.log('\u000c', ips + ' kips', r, s);
    console.error(
      '\n6502.js\t[ '+
	Math.floor(s.iCount / s.tTimems) + 'kips '+ s.iCount+ ' ' + s.tTimems +'ms ' +
	Math.floor(Math.log(s.iCount)/Math.log(10)+0.5) + ' ' +
	intCount + 'int ' +
	Math.floor(s.iCount/intCount) + 'i/int]  '+m[0x30e].toString(2)+'            \n');

    console.log(JSON.stringify(r)+'     ');
    console.log(JSON.stringify(s)+'     ');
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
  if (process.argv[2] !== 'test') {
    ORIC(process.argv[2]);
    return;
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
