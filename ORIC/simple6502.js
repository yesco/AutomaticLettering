//    ____   ______   ____    ____         Generated 6502(C) simulator
//   /    \  |       /    \  /    \   
//   |____   -----,  |    |   ____/        ("C") 2021 Jonas S Karlsson
//   |    \       |  |    |  /
//   \____/  \____/  \____/  |_____                  jsk.org

function CPU6502() { // generates one instance

// registers & memory
var a= 0, x= 0, y= 0, p= 0, s= 0, pc= 0, m= new Uint8Array(0xffff + 1);
const NMI= 0xfffa, RESET= 0xfffc, IRQ= 0xfffe;

function reset(a) { pc= w(a || RESET) }
function nmi(a) { PH(p); PH(pc >> 8); PH(pc & 0xff); reset(a || NMI) }
function irq() { nmi(IRQ) }

let w = (a) => m[a] + m[(a+1) & 0xff]<<8,
    PH= (v) =>{m[0x100 + s]= v; s= (s-1) & 0xff},
    PL= ( ) => m[0x100 + (s= (s+1) & 0xff)];

let C= 0x01, Z= 0x02, I= 0x04, D= 0x08, B= 0x10, Q= 0x20, V= 0x40, N= 0x80;

// set flag depending on value (slow?)
let z= (x)=> (p^= Z & (p^(x&0xff?0:Z)), x),
    n= (x)=> (p^= N & (p^ x)          , x),
    c= (x)=> (p^= C & (p^ (x > 255))  , x & 0xff),
    v= (x)=> (p^= V & (p^ (x * V))    , x),
    // set carry if low bit set (=C!)
    sc=(x)=> (p^= C & (p^ x)          , x);

function adc(v) {
  let oa= a;
  a= c(a + v + (p & C));
  v((oa^a) & (v^a));
  if (~p & D) return; else c(0);
  if ((a & 0x0f) > 0x09) a+= 0x06;
  if ((a & 0xf0) <= 0x90) return;
  a+= 0x60;
  sc(1);
}

let op /* Dutch! */, ic= 0, f, ipc, cpu, d, g, q;

function run(count= -1, trace= 0) {
  trace= 1==trace ? tracer : trace;
  trace && trace('print', 'head');
  let t= count;
  while(t--) {
    ic++; ipc= pc; mod= d= g= undefined;
    switch(op= m[pc++]) {
    case 0x0A: f='ASL_A';g= a= n(z(c( a << 1))); break;
    case 0x00: f='BRK';irq(); p|= B; break;
    case 0x10: f='BPL';q='imm';if (~p & N) pc+= m[pc++] -128; break;
    case 0x30: f='BMI';q='imm';if (p & N) pc+= m[pc++] -128; break;
    case 0x50: f='BVC';q='imm';if (~p & V) pc+= m[pc++] -128; break;
    case 0x70: f='BVS';q='imm';if (p & V) pc+= m[pc++] -128; break;
    case 0x90: f='BCC';q='imm';if (~p & C) pc+= m[pc++] -128; break;
    case 0xB0: f='BCS';q='imm';if (p & C) pc+= m[pc++] -128; break;
    case 0xD0: f='BNE';q='imm';if (~p & Z) pc+= m[pc++] -128; break;
    case 0xF0: f='BEQ';q='imm';if (p & Z) pc+= m[pc++] -128; break;
    case 0x18: f='CLC';g= p &= ~C; break;
    case 0x58: f='CLI';g= p &= ~I; break;
    case 0xB8: f='CLV';g= p &= ~V; break;
    case 0xD8: f='CLD';g= p &= ~D; break;
    case 0xCA: f='DEX';g= n(z(x= (x-1) & 0xff)); break;
    case 0x88: f='DEY';g= n(z(y= (y-1) & 0xff)); break;
    case 0xE8: f='INX';g= n(z(x= (x+1) & 0xff)); break;
    case 0xC8: f='INY';g= n(z(y= (y+1) & 0xff)); break;
    case 0x4C: f='JMP';q='abs';pc= w(pc); break;
    case 0x6C: f='JMPI';q='abs';pc= w(w(pc)); break;
    case 0x20: f='JSR';q='abs';pc--; PH(pc >> 8); PH(pc & 0xff); pc= w(pc+1); break;
    case 0xB6: f='LDX';q='zpy';g= z(a= m[((m[pc++] + y)& 0xff)]); break;
    case 0xBE: f='LDX';q='absy';g= z(a= m[w((pc+=2)-2) + y]); break;
    case 0x4A: f='LSR_A';g= n(z( a= sc(a) >> 1)); break;
    case 0xEA: f='NOP';; break;
    case 0x08: f='PHP';PH(g= p | 0x30); break;
    case 0x48: f='PHA';PH(g= a); break;
    case 0xDA: f='PHX';PH(g= x); break;
    case 0x5A: f='PHY';PH(g= y); break;
    case 0x28: f='PLP';g= p= PL(); break;
    case 0x68: f='PLA';g= n(z(a= PL())); break;
    case 0xFA: f='PLX';g= n(z(x= PL())); break;
    case 0x7A: f='PLY';g= n(z(y= PL())); break;
    case 0x2A: f='ROL_A';g= a= n(z(c( a<<1 + (p&C)))); break;
    case 0x6A: f='ROR_A';g= a= n(z( sc( a | ((p&C)<<8)))); break;
    case 0x40: f='RTI';pc= PL(); pc+= PL()<<8; p= PL(); break;
    case 0x60: f='RTS';pc= PL(); pc+= PL()<<8; break;
    case 0x38: f='SEC';g= p|= C; break;
    case 0x78: f='SEI';g= p|= I; break;
    case 0xF8: f='SED';g= p|= D; break;
    case 0x86: f='STX';q='zp';g= m[m[pc++]]= x; break;
    case 0x8E: f='STX';q='abs';g= m[w((pc+=2)-2)]= x; break;
    case 0x96: f='STX';q='zpy';g= m[((m[pc++] + y)& 0xff)]= x; break;
    case 0x8A: f='TXA';g= z(a= x); break;
    case 0x98: f='TYA';g= z(a= y); break;
    case 0x9A: f='TXS';g= z(s= x); break;
    case 0xA8: f='TAY';g= z(y= a); break;
    case 0xAA: f='TAX';g= z(x= a); break;
    case 0xBA: f='TSX';g= z(x= s); break;
    default:
      switch(mod= (op >> 2) & 7) {
      case 0: q='imm';    d= op&1 ?((m[pc++] + x)& 0xff,q='zpx'): pc++;break;
      case 1: q='zp';     d= m[pc++];                         break;
      case 2: q='imm';    d= op&1 ? pc++ : q='';              break;
      case 3: q='abs';    d= pc; pc+= 2;                      break;
      case 4: q='zpiy';   d= w(m[pc++] + y);                  break;
      case 5: q='zpx';    d= (m[pc++] + x) & 0xff;            break;
      case 6: q='absy';   d= w(pc) + y; pc+= 2;               break;
      case 7: q='absx';   d= w(pc) + x; pc+= 2;               break;
      }
      switch(i= (op>>5) + ((op&3)<<3)) {
      case 0x01: f='BIT'; g= z( m6v(n(m[d])) & a); break;
      case 0x04: f='STY'; g= m[d]= y; break;
      case 0x05: f='LDY'; g= z(a= m[d]); break;
      case 0x06: f='CPY'; g= n(z(c( y - m[d]))); break;
      case 0x07: f='CPX'; g= n(z(c( x - m[d]))); break;
      case 0x08: f='ORA'; g= n(z(a |= m[d])); break;
      case 0x09: f='AND'; g= n(z(a &= m[d])); break;
      case 0x0a: f='EOR'; g= n(z(a ^= m[d])); break;
      case 0x0b: f='ADC'; adc(m[d]); break;
      case 0x0c: f='STA'; g= m[d]= a; break;
      case 0x0d: f='LDA'; g= z(a= m[d]); break;
      case 0x0e: f='CMP'; g= n(z(c( a - m[d]))); break;
      case 0x0f: f='SBC'; adc(~m[d]); break;
      case 0x10: f='ASL'; g= m[d]= n(z(c( m[d] << 1))); break;
      case 0x11: f='ROL'; g= m[d]= n(z(c(m[d]<<1 + (p&C)))); break;
      case 0x12: f='LSR'; g= n(z( m[d]= sc(m[d]) >> 1)); break;
      case 0x13: f='ROR'; g= m[d]= n(z( sc( m[d] | ((p&C)<<8))));; break;
      case 0x15: f='LDX'; g= z(a= m[d]); break;
      case 0x16: f='DEC'; g= n(z(--m[d])); break;
      case 0x17: f='INC'; g= n(z(++m[d])); break;
      }
    }
    trace && trace(cpu, { ic, ipc, op, f, mod, add: d, val: g} );
  }
}
  
return cpu = {
  run, flags:ps, tracer, hex,
  state() { return { a, x, y, p, pc, s, m, ic}},
  last() { return { ipc, op, inst: f, addr: d, val: g}},
  reg(n,v='') { return eval(n+(v!=''?'='+v:''))},
