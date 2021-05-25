//    ____   ______   ____    ____         Generated 6502(C) simulator
//   /    \  |       /    \  /    \   
//   |____   -----,  |    |   ____/        ("C") 2021 Jonas S Karlsson
//   |    \       |  |    |  /
//   \____/  \____/  \____/  |_____                  jsk.org

//    Compact 6502 simulator
//
// ("C") 2021 Jonas S Karlsson
//
//       jsk.org
function CPU6502() { // generates one instance

// registers & memory
var a= 0, x= 0, y= 0, p= 0, s= 0, pc= 0, m= new Uint8Array(0xffff + 1);
const NMI = 0xfffa, RESET= 0xfffc, IRQ= 0xfffe;

function reset(a) { pc = w(a || RESET)}
function nmi(a) { PH(p); PH(pc >> 8); PH(pc & 0xff); reset(a || NMI)}
function irq() { nmi(IRQ)}

let w = (a) => m[a] + m[(a+1) & 0xff]<<8,
    PH= (v) =>{m[0x100 + s]= v; s= (s-1) & 0xff},
    PL= ( ) => m[0x100 + (s= (s+1) & 0xff)];

let C= 0x01, Z= 0x02, I= 0x04, D= 0x08, B= 0x10, Q= 0x20, V= 0x40, N= 0x80;

// set flag depending on value (slow?)
let z= (x)=> (p^= Z & (p^(x&0xff?0:Z)), x),
    n= (x)=> (p^= N & (p^ x)          , x),
    c= (x)=> (p^= C & (p^ (x > 255))  , x & 0xff),
    v= (x)=> (p^= V & (p^ (x * V))    , x),
    sc=(x)=> (p^= C & (p^ x)          , x); // cpy low bit

let flags=(i=7,v=128,r='')=>{for(;r+=p&v?'CZIDBQVN'[i]:' ',i--;v/=2);return r};
let hex=(n,x,r='')=>{for(;n--;x>>=4)r='0123456789ABCDEF'[x&0xf]+r;return r};

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

let op /* Dutch! */, ic = 0, f, ipc, cpu, d, g, mode;
// name2function (missing those with memory nodes)
var n2f = {
ASL_A(){ g= a= n(z(c( a << 1 ))) },   ROL_A(){ g= a= n(z(c(a<<1 + (p&C)))) },
LSR_A(){ g= n(z( a = sc(a) >> 1 )) }, ROR_A(){ g= a= n(z(sc(a | ((p&C)<<8))))},
STXimm(){ g= m[m[pc++]]= x},   LDXzpiy(){ g= z(a= m[((m[pc++] + y) & 0xff)])},
STXabs(){ g= m[w((pc+=2)-2)]= x},    LDXabsy(){ g= z(a= m[w((pc+=2)-2) + y])},
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
PHP(){ PH(g= p | 0x30) },               PLP(){ g= p= PL() },
PHA(){ PH(g= a) },                      PLA(){ n(g= z(a= PL())) },
PHX(){ PH(g= x) },                      PLX(){ n(g= z(x= PL())) },
PHY(){ PH(g= y) },                      PLY(){ n(g= z(y= PL())) },
JSR(){ d=w((pc+=2)-2); pc--; PH(pc >> 8); PH(pc & 0xff); pc= d },
BRK(){ irq(); p|= B },
TXA(){ g= z(a= x) },       TYA(){ g= z(a= y) },        TXS(){ g= z(s= x) },
TAX(){ g= z(x= a) },       TAY(){ g= z(y= a) },        TSX(){ g= z(x= s) },};
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
function ADC(){ adc(m[d])}                  function SBC(){ adc(~m[d])}
function CMP(){ g= n(z(c(a - m[d])))}       function AND(){ g= n(z(a &= m[d]))}
function CPX(){ g= n(z(c(x - m[d])))}       function ORA(){ g= n(z(a |= m[d]))}
function CPY(){ g= n(z(c(y - m[d])))}       function EOR(){ g= n(z(a ^= m[d]))}
function LDA(){ g= z(a= m[d])}              function STA(){ g= m[d]= a}
function LDX(){ g= z(a= m[d])}              /*       STX special     */
function LDY(){ g= z(a= m[d])}              function STY(){ g= m[d]= y}
function DEC(){ g= n(z(--m[d]))}            function INC(){ g= n(z(++m[d]))}
function ASL(){ g= m[d]= n(z(c( m[d] << 1 )))}
function LSR(){ g= n(z( m[d] = sc(m[d]) >> 1))}
function ROL(){ g= m[d] = n(z(c(m[d]<<1 + (p&C))))}
function ROR(){ g= m[d] = n(z( sc( m[d] | ((p&C)<<8))))}
function BIT(){ g= z( m6v(n(m[d])) & a)}
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
  let iii= cciii & 7, cc= cciii >> 3, mmm= mmmc >> 1, op= (iii << 5) | (mmm << 2) | cc;
  console.log('F=', 'op='+op, f.name, 'iii='+iii, m.name, 'mmm='+mmmc, 'c=='+cc);
  if (o2f[op]) {
    // console.log('   already defined: ', o2f[op]);
  } else if ((cc & 1) == (mmmc & 1)) {
    o2f[op]= f;
    o2m[op]= m;
  } else {
    // console.log("   NOT");
  }
})});

function run(count= -1, trace= 0) {
  trace= 1==trace ? tracer : trace;
  trace && trace('print', 'head');
  let t= count;
  while(t--) {
    ic++; ipc= pc; mod= d= g= undefined;
    op= m[pc++];                             // process one instruction
    mode= o2m[op];   mode && mode();         // get memory mode and run
    f= o2f[op];      f && f();               // get implementation and run
    trace && trace(cpu, { ic, ipc, op, f, mod, add: d, val: g} );
  }
}

return cpu= {
  run, flags:ps, tracer, hex,
  state() { return { a, x, y, p, pc, s, m, ic}},
  last() { return { ipc, op, inst: f, addr: d, val: g}},
  reg(n,v='') { return eval(n+(v!=''?'='+v:''))},
  consts() { return { NMI,RESET,IRQ, C,Z,I,D, B,Q,V,N}}};

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

function tracer(how,what) {
  let line;
  if (what == 'head') {
    line = '= pc    op mnemmomic  flags  a  x  y  s';
  } else {
    line = '= '+hex(4,ipc)+'  '+hex(2,op)+' '+
      ((f?f.name:'???')+(mode?mode.name:'---')).padEnd(8, ' ')+
      flags()+' '+hex(2,a)+' '+hex(2,x)+' '+hex(2,y)+' '+hex(2,s)+
      +(d?' d='+d:'')+(g?' g='+g:'')
  }

  if (how == 'string') {
    return line;
  } else {
    console.log(line);
  }
}
}



// testing
let cpu = CPU6502();
let m = cpu.state().m;
let hex = cpu.hex;

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
  console.log(cpu.run(3, 1));
}

console.log('--------------');
console.log('state= ', cpu.state());
cpu.reg('a', 3);
console.log('state= ', cpu.state());

console.log('a=', cpu.reg('a'));
console.log('p=', cpu.reg('p'));
console.log('pc=', cpu.reg('pc'));
console.log('sc=', cpu.reg('s'));
console.log('flags=', cpu.flags());

dump(0);
console.log(cpu.run(3, 1));

if (0) {
console.log('=======================');
let start = 0x501, p = start;
m[p++] = 0xa9; // LDA# 42
m[p++] = 0x42;
m[p++] = 0xa2; // LDX# fe
m[p++] = 0xfe;
m[p++] = 0xe8; // INX
m[p++] = 0xd0; // BNE -1
m[p++] = 0xff;
m[p++] = 0xad; // LDY# 17
m[p++] = 0x17;
m[p++] = 0xad; // STYZP 07
m[p++] = 0x07;
m[p++] = 0x00; // BRK
cpu.reg('pc', start);

console.log('state= ', cpu.state());

console.log(cpu.run(10, 1));

dump(0);
} else {
console.log('=======================');
cpu.reg('a', 0x42);
cpu.reg('x', 0x00);
cpu.reg('y', 0x69);
cpu.reg('p', 0);
console.log('state= ', cpu.state());

let start = 0x501, p = start;
m[p++] = 0x48; // PHA
m[p++] = 0x8a; // TXA
m[p++] = 0x48; // PHA
m[p++] = 0x98; // TYA
m[p++] = 0xaa; // TAX
m[p++] = 0x68; // PLA
m[p++] = 0xa8; // TAY
m[p++] = 0x68; // PLA
m[p++] = 0x00; // BRK

cpu.reg('pc', start);
console.log('state= ', cpu.state());

console.log(cpu.run(10, 1));
dump(0);
}
