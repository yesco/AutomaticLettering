//    Compact 6502 simulator
//
// ("C") 2021 Jonas S Karlsson
//
//       jsk.org
function CPU6502() { // generates one instance

// registers & memory
var a = 0, x = 0, y = 0, p = 0, s = 0, pc = 0;
let m = new Uint8Array(0xffff + 1);
const NMI = 0xfffa, RESET = 0xfffc, IRQ   = 0xfffe;

let w  = (a) => m[a] + m[(a+1) & 0xff]<<8,
    PH = (v) =>{console.log("MEM=", m, "a=", a);
m[0x100 + s]= v; s= (s-1) & 0xff},
    PL = ( ) => m[0x100 + (s= (s+1) & pxff)];

let C = 0x01, Z = 0x02, I = 0x04, D = 0x08;
let B = 0x10, Q = 0x20, V = 0x40, N = 0x80;

// set flag depending on value (slow?)
let z= (x)=> (p^= Z & (p^(x&0xff?0:Z)), x),
    n= (x)=> (p^= N & (p^ x)          , x),
    c= (x)=> (p^= C & (p^ (x > 255))  , x & 0xff),
    v= (x)=> (p^= V & (p^ (x * V))    , x),
    // set carry if low bit set (=C!)
    sc=(x)=> (p^= C & (p^ x)          , x);

function adc(v) {
  let oa = a;
  a = c(a + v + (p & C));
  v((oa^a) & (v^a));
  if (~p & D) return; else c(0);
  if ((a & 0x0f) > 0x09) a += 0x06;
  if ((a & 0xf0) <= 0x90) return;
  a += 0x60;
  sc(1);
}

let op /* Dutch! */, ic = 0, f, ipc, cpu, d, g, q;
// name2function (missing those with memory nodes)
var n2f = {
ASL_A(){ g= a= n(z(c( a << 1 ))) },   ROL_A(){ g= a= n(z(c(a<<1 + (p&C)))) },
LSR_A(){ g= n(z( a = sc(a) >> 1 )) }, ROR_A(){ g= a= n(z(sc(a | ((p&C)<<8))))},
STXimm(){ g= m[m[pc++]]= x},   LDXzpiy(){ z(g= a= m[((m[pc++] + y) & 0xff)])},
STXabs(){ g= m[w((pc+=2)-2)]= x},    LDXabsy(){ z(g= a= m[w((pc+=2)-2) + y])},
STXzpy(){ g= m[((m[pc++] + y) & 0xff)]= x},
BPL(){ if (~p & N) pc += m[pc++] -128}, BMI(){ if (p & N) pc += m[pc++] -128},
BVC(){ if (~p & V) pc += m[pc++] -128}, BVS(){ if (p & V) pc += m[pc++] -128},
BCC(){ if (~p & C) pc += m[pc++] -128}, BCS(){ if (p & C) pc += m[pc++] -128},
BNE(){ if (~p & Z) pc += m[pc++] -128}, BEQ(){ if (p & Z) pc += m[pc++] -128},
CLC(){ g= p &=~C},  CLI(){ g= p &=~I},  CLD(){ g= p &=~D},  CLV(){ g= p &=~V},
SEC(){ g= p |= C},  SEI(){ g= p |= I},  SED(){ g= p |= D},  NOP(){  },
DEX(){ g= n(z(x= (x-1) & 0xff)) },      INX(){ g= n(z(x = (x+1) & 0xff)) },
DEY(){ g= n(z(y= (y-1) & 0xff)) },      JNY(){ g= n(z(y = (y+1) & 0xff)) },
JMP(){ d=w((pc+=2)-2); pc= d },         JMPI(){ d=w((pc+=2)-2); pc= w(d) },
RTS(){ pc = PL(); pc += PL()<<8 },      RTI(){ RTS(); p = PL() },
JSR(){ d=w((pc+=2)-2); pc--; PH(pc >> 8); PH(pc & 0xff); pc= d },
BRK(){ PH(p); PH(pc >> 8); PH(pc & 0xff); p|= B; pc = w(0xfffe) },
PHP(){ PH(g= p | 0x30) },               PLP(){ g= p= PL() },
PHA(){ PH(g= a) },                      PLA(){ g= a= PL() },
PHX(){ PH(g= x) },                      PLX(){ g= x= PL() },
PHY(){ PH(g= y) },                      PLY(){ g= y= PL() },
TXA(){ z(g= a= x) },       TYA(){ z(g= a= y) },        TXS(){ z(g= s= x) },
TAX(){ z(g= a= x) },       TAY(){ z(g= y= a) },        TSX(){ z(g= x= s) },};
// Opcode to Mode mapping, and Opcode to Function (not yet complet)
var _ = n2f, o2m=Array(256), o2f=[_.BRK,,,,,,,,_.PHP,,_.ASL_A,,,,,,_.BPL,,,,,,
,,_.CLC,,,,,,,,_.JSR,,,,,,,,_.PLP,,_.ROL_A,,,,,,_.BMI,,,,,,,,_.SEC,,,,,,,,
_.RTI,,,,,,,,_.PHA,,_.LSR_A,,_.JMP,,,,_.BVC,,,,,,,,_.CLI,,_.PHY,,,,,,_.RTS,,,,
,,,,_.PLA,,_.ROR_A,,_.JMPI,,,,_.BVS,,,,,,,,_.SEI,,_.PLY,,,,,,,,,,,,_.STX,,
_.DEY,,_.TXA,,,,_.STX,,_.BCC,,,,,,_.STX,,_.TYA,,_.TXS,,,,,,,,,,,,,,_.TAY,,
_.TAX,,,,,,_.BCS,,,,,,_.LDX,,_.CLV,,_.TSX,,,,_.LDX,,,,,,,,,,_.INY,,_.DEX,,,,,,
_.BNE,,,,,,,,_.CLD,,_.PHX,,,,,,,,,,,,,,_.INX,,_.NOP,,,,,,_.BEQ,,,,,,,,_.SED,,
_.PLX,,,,,,];
// the memory mode functions - generic implementations
function U   () {} // Unimplemented (NOP/BRK?)
function ADC(){ adc(m[d]) }
function AND(){ g= n(z(a &= m[d])) }
function ASL(){ g= m[d]= n(z(c( m[d] << 1 ))) }
function BIT(){ g= z( m6v(n(m[d])) & a) }
function CMP(){ g= n(z(c( a - m[d] ))) }
function CPX(){ g= n(z(c( x - m[d] ))) }
function CPY(){ g= n(z(c( y - m[d] ))) }
function DEC(){ g= n(z(--m[d])) }
function EOR(){ g= n(z(a ^= m[d])) }
function INC(){ g= n(z(++m[d])) }
function LDA(){ z(g= a= m[d]) }
function LDX(){ z(g= a= m[d]) }
function LDY(){ z(g= a= m[d]) }
function LSR(){ g= n(z( m[d] = sc(m[d]) >> 1)) }
function ORA(){ g= n(z(a |= m[d])) }
function ROL(){ g= m[d] = n(z(c(m[d]<<1 + (p&C)))) }
function ROR(){ g= m[d] = n(z( sc( m[d] | ((p&C)<<8) ))); }
function SBC(){ adc(~m[d]) }
function STA(){ g= m[d]= a }
function STY(){ g= m[d]= y }
// r is indexable by cc iii from opcode = iii mmm cc
var r=[,BIT,,,STY,LDY,CPY,CPX, ORA,AND,EOR,ADC,STA,LDA,CMP,SBC,ASL,ROL,LSR,ROR,,,LDX,DEC,INC];
// addressing modes implementation
function acc(){  }
function imm(){  d= pc++ }
function zp() {  d= m[pc++] }
function abs(){  d= pc; pc+= 2 }
function zpiy(){ d= w(m[pc++] + yf) }
function zpx(){  d= (m[pc++] + x) & 0xff }
function absy(){ d= w(pc) + y; pc+= 2 }
function absx(){ d= w(pc) + x; pc+= 2 }
// mapping from mmm c -> actual mode (see opcode defininition above)
var mc=[imm,zpx, zp,zp, acc,imm, abs,abs, zpiy,zpiy, zpx, absy,absx];
// initialize and fill in memory modes functions
r.forEach((f,cciii)=>{   mc.forEach((m,mmmc)=>{
  let iii = cciii & 7, cc = cciii >> 3, mmm = mmmc >> 1, op = (iii << 5) | (mmm << 2) | cc;
  console.log('F=', 'op='+op, f.name, 'iii='+iii, m.name, 'mmm='+mmmc, 'c=='+cc);
  if (o2f[op]) {
    // console.log('   already defined: ', o2f[op]);
  } else if ((cc & 1) == (mmmc & 1)) {
    o2f[op] = f;
    o2m[op] = m;
  } else {
    // console.log("   NOT");
  }
})});

// TOOO: remove
// dump the list for verification
if (1) {
  let n = 0;
  o2f.forEach((f,i)=>{
    if (!f) return; else n++;
    let m = o2m[i];
    console.log('=', i.toString(16).padStart(2, '0').toUpperCase(), f.name, m ? m.name : '-');
  });
  console.log(n); // this gives us 149 (there are 151!)
  // 2 missing?
}

function tracer() {
  console.log(hex(4, ic), ' ', /*dump pc-ipc*/
    f, q, d, g, statu());
}

function run(count = -1, trace = 0) {
  trace = 1==trace ? tracer : trace;
  let t = count;
  while(t--) {
    ic++; ipc = pc; mod = d = g = undefined;
    op  = m[pc++];
    // get memory mode and run
    mod = o2m[op];
    mod && mod();
    // get implementation and run
    f = o2f[op];
    f && f();

    console.log(ipc, 'op='+op, f ? f.name:'', m ? m.name:'', 'd='+d, 'g='+g, 'v='+v);
    trace && trace(cpu, { ic, ipc, op, f, mod, add: dr, val: g} );
  }
}

return cpu = {
  run, // dis
  state() { return { a, x, y, p, pc, s, m, ic}},
  last() { return { ipc, op, inst: f, addr: d, val: g}},
  reg(n, v) { return eval(n+(typeof a?'':'='+v))},
  consts() { return { NMI,RESET,IRQ, C,Z,I,D, B,Q,V,N}}

}

}



// testing
let cpu = CPU6502();
let m = cpu.state().m;

let hex=(n,x,r='')=>{for(;n--;x>>=4)r='0123456789ABCDEF'[x&0xf]+r;return r};
let PS=(i=7,v=128,r='')=>{for(;r+=p&v?'CZIDBQVN'[i]:' ',i--;v/=2);return r};

let dump=(a=0,n=8,l=1,i=0,r='',p='',v)=>{
  for(;i<n*l;i++){
    if (i%n==0) r += (r?'  '+p+'\n':'') + hex(4,a+i)+': ', p='';
    r+= hex(2,v=m[a++]) + ' ';
    p+= (v >= 32 && v < 128) ? String.fromCharCode(v) : '.';
  }
  return r+'  '+p;
}

let nn = 3;

while (nn--) {
  console.log('cpu= ', cpu);
  console.log('state= ', cpu.state());
  console.log('last= ', cpu.last());
  console.log('consts= ', cpu.consts());
  console.log(cpu.run(1));
}
