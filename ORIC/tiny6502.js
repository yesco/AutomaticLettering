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
var _ = n2f;

////////////////////////////////////////////////////////////////////////////////
var o2m=Array(256), o2f=[_.BRK,,,,,,,,_.PHP,,_.ASL_A,,,,,,_.BPL,,,,,,,,_.CLC,,
,,,,,,_.JSR,,,,,,,,_.PLP,,_.ROL_A,,,,,,_.BMI,,,,,,,,_.SEC,,,,,,,,_.RTI,,,,,,,,
_.PHA,,_.LSR_A,,_.JMP,,,,_.BVC,,,,,,,,_.CLI,,_.PHY,,,,,,_.RTS,,,,,,,,_.PLA,,
_.ROR_A,,_.JMPI,,,,_.BVS,,,,,,,,_.SEI,,_.PLY,,,,,,,,,,,,_.STX,,_.DEY,,_.TXA,,,
,_.STX,,_.BCC,,,,,,_.STX,,_.TYA,,_.TXS,,,,,,,,,,,,,,_.TAY,,_.TAX,,,,,,_.BCS,,,
,,,_.LDX,,_.CLV,,_.TSX,,,,_.LDX,,,,,,,,,,_.INY,,_.DEX,,,,,,_.BNE,,,,,,,,_.CLD,
,_.PHX,,,,,,,,,,,,,,_.INX,,_.NOP,,,,,,_.BEQ,,,,,,,,_.SED,,_.PLX,,,,,,];

function U   () {} // Unimplemented (NOP/BRK?)
function BIT(){ g= z( m6v(n(m[d])) & a) }
function STY(){ g= m[d]= y }
function LDY(){ z(g= a= m[d]) }
function CPY(){ g= n(z(c( y - m[d] ))) }
function CPX(){ g= n(z(c( x - m[d] ))) }
function ORA(){ g= n(z(a |= m[d])) }
function AND(){ g= n(z(a &= m[d])) }
function EOR(){ g= n(z(a ^= m[d])) }
function ADC(){ adc(m[d]) }
function STA(){ g= m[d]= a }
function LDA(){ z(g= a= m[d]) }
function CMP(){ g= n(z(c( a - m[d] ))) }
function SBC(){ adc(~m[d]) }
function ASL(){ g= m[d]= n(z(c( m[d] << 1 ))) }
function ROL(){ g= m[d] = n(z(c(m[d]<<1 + (p&C)))) }
function LSR(){ g= n(z( m[d] = sc(m[d]) >> 1)) }
function ROR(){ g= m[d] = n(z( sc( m[d] | ((p&C)<<8) ))); }
function LDX(){ z(g= a= m[d]) }
function DEC(){ g= n(z(--m[d])) }
function INC(){ g= n(z(++m[d])) }
var r=[,BIT,,,STY,LDY,CPY,CPX, ORA,AND,EOR,ADC,STA,LDA,CMP,SBC,ASL,ROL,LSR,ROR,,,LDX,DEC,INC];

function acc(){  }
function imm(){  d= pc++ }
function zp() {  d= m[pc++] }
function abs(){  d= pc; pc+= 2 }
function zpiy(){ d= w(m[pc++] + yf) }
function zpx(){  d= (m[pc++] + x) & 0xff }
function absy(){ d= w(pc) + y; pc+= 2 }
function absx(){ d= w(pc) + x; pc+= 2 }
var mc=[imm,zpx, zp,zp, acc,imm, abs,abs, zpiy,zpiy, zpx, absy,absx];

r.forEach((f,cciii)=>{   mc.forEach((m,mmmc)=>{
  let iii = cciii & 7, cc = cciii >> 3, mmm = mmmc >> 1, op = (iii << 5) | (mmm << 2) | cc;
  console.log('F=', 'op='+op, f.name, 'iii='+iii, m.name, 'mmm='+mmmc, 'c=='+cc);
  //if (((mmmc & 1) == (cc & 1)) && f && m && !o2f[op])
  if (o2f[op]) console.log('   already defined: ', o2f[op]);
  else if ((cc & 1) == (mmmc & 1)) o2f[op] = f, o2m[op] = m; else console.log("   NOT");
})});

let n = 0;
o2f.forEach((f,i)=>{
  if (!f) return; else n++;
  let m = o2m[i];
  console.log('=', i.toString(16).padStart(2, '0').toUpperCase(), f.name, m ? m.name : '-');
});
console.log(n); // this gives us 158 (there are only 151!)

