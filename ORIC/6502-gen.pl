# Generates a 6502 javascript file on stdout!
#
# ref for 6502
# - https://github.com/jamestn/cpu6502/blob/master/cpu6502.c
# - http://rubbermallet.org/fake6502.c
# (the latter ones got cycle counting)
#
# consider testing using:
# - https://github.com/pmonta

# address calculation of argument
# (this is intended to be used inline, so cannot have second expression
#  there (pc+=2)-2: there is no post add 2... (pc++++)
#
%modes = (
    'imm', 'pc++',
    'zp',  'm[pc++]',
     #zpy is zpx but for STX it's senseless
    'zpx', '((m[pc++] + x)& 0xff)',
    'zpy', '((m[pc++] + y)& 0xff)', 
    'abs', 'w((pc+=2)-2)',
    'absx', 'w((pc+=2)-2) + x',
    'absy', 'w((pc+=2)-2) + y',
    'zpi',  'w(m[pc++])', # 6502C?
    'zpxi', 'w(m[pc++ + (x & 0xff)])',
    'zpiy', 'w(m[pc++] + y)',
);

# instructions to generated code
#
# alt 1:
#   MEM  - substitute by $modes{$m}
#   ADDR - prefix by addr=$modes{$m}, subst: addr
# alt 2:
#   do calculations before and store
#     addr = ...
#     (b    = byte value
#      w    = word value)
%impl = (
    'lda', 'g= z(a= MEM)',
    'ldx', 'g= z(a= MEM)',
    'ldy', 'g= z(a= MEM)',

    'sta', 'g= MEM= a',
    'stx', 'g= MEM= x',
    'sty', 'g= MEM= y',
    'stz', 'g= MEM= 0', # 6502C

    'and', 'g= n(z(a &= MEM))',
    'eor', 'g= n(z(a ^= MEM))',
    'ora', 'g= n(z(a |= MEM))',

# TODO: check how c() is implemented!
# C	Carry Flag	Set if A >= M
#  uint16_t result = regs.y - mem_read(addr);
#
#  regs.p.c = result > 255;
    'cmp', 'g= n(z(c( a - MEM)))',
    'cpx', 'g= n(z(c( x - MEM)))',
    'cpy', 'g= n(z(c( y - MEM)))',

    'asl',   'g= m[ADDR]= n(z(c( m[ADDR] << 1)))',
    'asl_a', 'g=       a= n(z(c(       a << 1)))',

    'lsr',   'g= n(z( m[ADDR]= sc(m[ADDR]) >> 1))',
    'lsr_a', 'g= n(z(       a=       sc(a) >> 1))',

    'rol',   'g= m[ADDR]= n(z(c(m[ADDR]<<1 + (p&C))))',
    'rol_a', 'g=       a= n(z(c(      a<<1 + (p&C))))',

    'ror',    'g= m[ADDR]= n(z( sc( m[ADDR] | ((p&C)<<8))));',
    'ror_a',  'g=       a= n(z( sc(       a | ((p&C)<<8))))',

    'adc', 'adc(MEM)',
    'sbc', 'adc(~MEM)', # lol

    # notice B.. uses signed byte!
    'bra', 'pc += RMEM', # 6502C

    'bpl', 'if (~p & N) pc+= RMEM',
    'bvc', 'if (~p & V) pc+= RMEM',
    'bcc', 'if (~p & C) pc+= RMEM',
    'bne', 'if (~p & Z) pc+= RMEM',

    'bmi', 'if (p & N) pc+= RMEM',
    'bvs', 'if (p & V) pc+= RMEM',
    'bcs', 'if (p & C) pc+= RMEM',
    'beq', 'if (p & Z) pc+= RMEM',
    
# BIT - Bit Test
# A & M, N = M7, V = M6
#
# This instructions is used to test if one or more bits are set in a target memory location. The mask pattern in A is ANDed with the value in memory to set or clear the zero flag, but the result is not kept. Bits 7 and 6 of the value from memory are copied into the N and V flags.
#
# jsk: not clear: 76 from memory are copied or from the combined result?

    'bit', 'g= z( m6v(n(m[ADDR])) & a)',
#   'bit', 'g= m6m7(n(z(m[ADDR])))',

    'nop', '',

    # it seems assumed pc points to next memory
    # location. Hmmm. Maybe change that???

    'jmp',   'pc= w(pc)',
    'jmpi',  'pc= w(w(pc))',
    'jsr',   'pc--; PH(pc >> 8); PH(pc & 0xff); pc= w(pc+1)',

    'brk', 'irq(); p|= B',
    'rts', 'pc= PL(); pc+= PL()<<8',
    'rti', 'pc= PL(); pc+= PL()<<8; p= PL()',

    'php', 'PH(g= p | 0x30)',
    'pha', 'PH(g= a)',

    'phx', 'PH(g= x)', # 6502C
    'phy', 'PH(g= y)', # 6502C
    
    'plp', 'g= p= PL()',
    'pla', 'g= n(z(a= PL()))',
    'plx', 'g= n(z(x= PL()))', # 6502C
    'ply', 'g= n(z(y= PL()))', # 6502C

    # cleverly (a=777) returns 777,
    # even if a is byte from byte array
    'dec', 'g= n(z(--m[ADDR]))',
    'dea', 'g= n(z(a= (a-1) & 0xff))', # 6502C
    'dex', 'g= n(z(x= (x-1) & 0xff))',
    'dey', 'g= n(z(y= (y-1) & 0xff))',

    'inc', 'g= n(z(++m[ADDR]))',
    'ina', 'g= n(z(a= (a+1) & 0xff))', # 6502C
    'inx', 'g= n(z(x= (x+1) & 0xff))',
    'iny', 'g= n(z(y= (y+1) & 0xff))',

    'clc', 'g= p &= ~C',
    'cli', 'g= p &= ~I',
    'clv', 'g= p &= ~V',
    'cld', 'g= p &= ~D',

    'sec', 'g= p|= C',
    'sei', 'g= p|= I',
    'sed', 'g= p|= D',

    'txa', 'g= z(a= x)',
    'tya', 'g= z(a= y)',
    'txs', 'g= z(s= x)',
    'tay', 'g= z(y= a)',
    'tax', 'g= z(x= a)',
    'tsx', 'g= z(x= s)',
);

# prelude w wrappings

print <<'PRELUDE';
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
PRELUDE

my @modes = (
    'imm/zpx', 'zp', 'acc/imm', 'abs', 
    'zpiy', 'zpx', 'absy', 'absx',
);

my %mod2i = ();

$i = 0;
for $m (@modes) {
    $mod2i{$m} = $i++;
}

# - Excepton modes

# 96 stx = stx 4 2      zpy    zpxi
# 20 jsr = jsr 1 0     0 abs    -
# A2 ldx = ldx 5 2     0 imm    zpxi
# B6 ldx = ldx 5 2     5 zpy    zpx
# BE ldx = ldx 5 2     7 absy    absx

# * = done


# maping from op code to instruction name
sub decode {
    my ($op, $mnc, $mod) = @_;

    my $v = hex($op);
    my $mmm = ($v >> 2) & 7;
    my $iii = ($v >> 5);
    my $cc = ($v & 3);
    my @arr;

    my $x, $n, $m = '-', $exception;;

    
#   0xx 000 00 = call&stack       BRK JSR RTI RTS
if ((0b10011111 & $v) == 0b00000000) {
    @arr = ('brk', 'jsr', 'rti', 'rts');
    die "Already have x:$x<!" if defined($x);
    $x = $iii;
    $m = 'abs';
}

#   0xx 010 00 = stack            PHP PLP PHA PLA
elsif ((0b10011111 & $v) == 0b00001000) {
    @arr = ('php', 'plp', 'pha', 'pla');
    die "Already have x:$x<!" if defined($x);
    $x = $iii;
}

#
#   xx0 110 00 = magic flags =0   CLC CLI*TYA CLD
#   xx1 110 00 = magic flags =1   SEC SEI --- SED
elsif ((0b00011111 & $v) == 0b00011000) {
    @clc = ('clc','sec','cli','sei','tya','---','cld','sed');
    die "Already have x:$x<!" if defined($x);
    $x = $iii;
}

#
#   1xx 010 00 = v--transfers--> *DEY TAY INY INX
elsif ((0b10011111 & $v) == 0b10001000) {
    @dey = ('dey', 'tay', 'iny', 'inx');
    die "Already have x:$x<!" if defined($x);
    $x = $iii;
}

#   1xx x10 10 = TXA TXS TAX TSX  DEX --- NOP ---
elsif ((0b10001111 & $v) == 0b10001010) {
    @arr = ('tsa', 'txs', 'tax', 'tsx', 'dex', '---', 'nop', '---');
    die "Already have x:$x<!" if defined($x);
    $x = ($v >> 4) & 7;;
}

#
#   ffv 100 00 = branch instructions:
#   ff0 100 00 = if flag == 0     BPL BVC BCC BNE
#   ff1 100 00 = if flag == 1     BMI BVS BCS BEQ
elsif ((0b00011111 & $v) == 0b00010000) {
    @arr = ('bpl','bmi','bvc','bvs','bcc','bcs','bne','beq');
    die "Already have x:$x<!" if defined($x);
    $x = $iii;
    $m = 'imm';
    $mmm = $mod2i{$m};
}

#                            (v--- indirect)
#   xxx mmm 00 = --- BIT JMP JMP* STY LDY CPY CPX
#   xxx mmm 01 = ORA AND EOR ADC  STA LDA CMP SBC
#   xxx mmm 10 = ASL ROL LSR ROR  STX LDX DEC INC
elsif ((0b00000000 & $v) == 0b00000000) {
    @arr = (
  '---','bit','jmp','jmpi', 'sty','ldy','cpy','cpx',
  'ora','and','eor','adc',  'sta','lda','cmp','sbc',
  'asl','rol','lsr','ror',  'stx','ldx','dec','inc');
    die "Already have x:$x<!" if defined($x);

    # 61         = ADC ($44,X)
    # 011 000 01 

    $x = ($cc << 3) + $iii;
    $m = $modes[$mmm];

    #print "x op=$op  iii=$iii mmm=$mmm cc=$cc   m=$m\n";

    # exceptions
    $mmm = $mod2i{'absy'} if $op eq 'BE';

    # name it
    $m = $modes[$mmm];
    #   use cc to clarify
    $m = $cc & 1 ? 'zpxi' : 'imm' if $mmm == 0;
    $m = $cc & 1 ? 'imm'  : 'acc' if $mmm == 2;
    $m = 'zpy' if $op =~ /(96|B6)/;

    #print "x op=$op  iii=$iii mmm=$mmm cc=$cc   m=$m\n";

# FAIL
} else {
    die "No found x!";
}

    my $n = $arr[$x];

    return ($v, $iii, $mmm, $cc, $x, $n, $m);
}

# 6502C ? ignore...

# 72 adc   ror 3 2  19     4 zpi
# 32 and   rol 1 2  17     4 zpi
# 80 bra   sty 4 0  4     0 imm
# D2 cmp   dec 6 2  22     4 zpi
# 52 eor   lsr 2 2  18     4 zpi
# B2 lda   ldx 5 2  21     4 zpi
# 12 ora   asl 0 2  16     4 zpi
# F2 sbc   inc 7 2  23     4 zpi
# 92 sta   stx 4 2  20     4 zpi
# 64 stz   jmpi 3 0  3     1 zp
# 74 stz   jmpi 3 0  3     5 zpx
# 9C stz   sty 4 0  4     7 abs
# 9E stz   stx 4 2  20     7 absx
# 14 trb   --- 0 0  0     5 zp
# 1C trb   --- 0 0  0     7 abs
# 04 tsb   --- 0 0  0     1 zp
# 0C trb   --- 0 0  0     3 abs
$c6502 = ' 72 32 80 D2 52 B2 12 F2 92 64 74 9C 9E 14 1C 04 0C 3A 1A ';

# generate instructions
my $shortercode = 1;
my $debuginfo = 1;
my $genfun = 0;

open IN, "op-mnc-mod.lst" or die "bad file";
my @ops, %mnc, %mod, %saved;
while (<IN>) {
    my ($op, $mnc, $mod) =/^(..) (\w+) ?(|\w*)$/;    die "no op: $_" unless $op;

    next if $c6502 =~ /$op/;


    my $line = "    case 0x$op: ";


    # TODO: test if mod aggrees w mmm bits?
    my $node = '';
    if ($mod =~ /\w/) {
	my ($v, $iii, $mmm, $cc, $x, $n, $m) = &decode($op); 
	my $neq = ($mnc eq $n) ? '=' : ' ';
	my $meq = ($mod eq $m) ? '==' : '  ';
	if (!$neq || !$meq) {
	    print "Decoding error!\n";
	    print "= $op $mnc $neq $n $iii $cc     $mmm $mod $meq $m\n";
	}
	if ($shortercode && !($op =~ /(86|8E|96|B6|BE|4C|6C|20)/)
	    && !((0b00011111 & $v) == 0b00010000)) # no branch
	{
	    #$saved{$mnc} .= " $op,$mnc,$mod ";
	    $saved_m{$mnc} |= 1 << $mmm;
	    $saved_x{$mnc} = $x;
	    $saved{$mnc} .= "case 0x$op: ";
	    next;
	}
; #($shortercode && $mod
	my $comment = '';
#	unless (($mod eq $modes[$mmm]) || ($mnc =~ /^b../)) {
	unless ($mod eq $modes[$mmm]) {
	    # print "------foobar\n"; print works
	    # doesn't seem to want to add this?
	    $comment = " // MODE $mod instead of mmm";
	}

    }

    if ($debuginfo) {
	$line .= "f='".(uc $mnc)."';";
	$line .= "q='$mod';" if $mod;
    }

    # address stuff
    my $i = $impl{$mnc};
    #print "/y $op $i\n";
    $i =~ s/RMEM/MEM -128/;
    $i =~ s/MEM/m[$modes{$mod}]/;
    if ($i =~ /ADDR/) {
	$i = 'd= '.$modes{$mod}."; $i";
	$i =~ s/ADDR/d/g;
    }
    die "MEM:only use once:$i" if $i =~ /MEM/;
    $i =~ s/ +/ /g;
    #print "\\y $op $i\n";

    $line .= $i."; $comment";

    if ($genfun) {
	my $r = sprintf("%s(){ $i }\n", uc $mnc);
	print ",$r";
	$gendata{$op} = uc $mnc;
    }

    my $wid = 55;

    if (0) { # format
	print sprintf("%-${wid}s", $line);
    } else { # plain
	print $line;
    }

    if (!$debuginfo) {
	print "break; // ",uc($mnc)," $mod\n";
    } else {
	print "break;\n";
    }

    #print '----LINE TOO LONG: ', length($line), "\n" if length($line) > $wid;

}

# LATER!
if ($shortercode) {

    # first generate mode stuff

    # trouble instructions
    # avoid in generic code
    # /(86|8E|96|B6|BE)/
    # zpy is zpx but for STX it's senseless
    #
    # 'zpy', '(m[pc++] + y) & 0xff', 
    # 'zpi',  'wrap(m[pc++])', # 6502C?
    # 'zpxi', 'wrap(m[pc++ + (x & 0xff)])',

    print "    default:
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
";

    # print generic instructions
    print "      switch(i= (op>>5) + ((op&3)<<3)) {\n";

    foreach $inst (sort { $saved_x{$a} <=> $saved_x{$b} } keys %saved) {
	my $iiiii = sprintf("0x%02x", $saved_x{$inst});
	my $mod = $saved{$inst};

	# instruction
	my $i = $impl{$inst};
	$i =~ s/MEM/m[d]/;
	if ($i =~ /ADDR/) {
	    $i =~ s/ADDR/d/g;
	    die "MEM:only use once:$i" if $i =~ /MEM/;
	    $i =~ s/ +/ /g;
	}
#	print "      // IMPL: $impl{$inst}\n";
#	print "      // $saved{$inst}\n";
#	print sprintf("      // if (%#2x & mod) {...\n", $saved_m{$inst});
	if ($debuginfo) {
	    print "      case $iiiii: f='", uc $inst, "'; $i; break;\n";
	} else {
	    print "      case $iiiii: $i; break; // ", uc $inst, "\n";
	}

	if ($genfun) {
	    my $r = sprintf("%s(){ $i }\n", uc $inst);
	    print ",,$r";
	    $gendata{$op} = uc $mnc;
	}

    }

#    print "      }\n";
    print "      }\n";

}

# postlude
print "    }
    trace && trace(cpu, { ic, ipc, op, f, mod, add: d, val: g} );
  }
}
  
return cpu = {
  run, flags:ps, tracer, hex,
  state() { return { a, x, y, p, pc, s, m, ic}},
  last() { return { ipc, op, inst: f, addr: d, val: g}},
  reg(n,v='') { return eval(n+(v!=''?'='+v:''))},
  consts() { return { NMI,RESET,IRQ, C,Z,I,D, B,Q,V,N}}};

////////////////////////////////////////
// optional: mini disasm and debugger

function hex(n,x,r=''){for(;n--;x>>=4)r='0123456789ABCDEF'[x&0xf]+r;return r};
function ps(i=7,v=128,r=''){for(;r+=p&v?'CZIDBQVN'[i]:' ',i--;v/=2);return r};

function tracer(how,what) {
  let line;
  if (what == 'head') {
    line = '= pc    op mnemonic   flags  a  x  y  s';
  } else {
    line = '= '+hex(4,ipc)+'  '+hex(2,op)+' '+
      ((f?f:'???')+(q?q:'---')).padEnd(8, ' ')+
      ps()+' '+hex(2,a)+' '+hex(2,x)+' '+hex(2,y)+' '+hex(2,s)+
      +(d?' d='+d:'')+(g?' g='+g:'')
  }

  if (how == 'string') {
    return line;
  } else {
    console.log(line);
  }
}

} // end CPU6502
";

if (1) {
    print "

// testing
let cpu = CPU6502();
let m = cpu.state().m;
let hex = cpu.hex;

let dump=(a=0,n=8,l=1,i=0,r='',p='',v)=>{
  for(;i<n*l;i++){
    if (i%n==0) r += (r?'  '+p+'\\n':'') + hex(4,a+i)+': ', p='';
    r+= hex(2,v=m[a++]) + ' ';
    p+= (v >= 32 && v < 128) ? String.fromCharCode(v) : '.';
  }
  return r+'  '+p;
}

if (0) {
// run 3 times with 3 instr:s each time
let nn = 3;
while (nn--) {
  console.log('cpu= ', cpu);
  console.log('state= ', cpu.state());
  console.log('last= ', cpu.last());
  console.log('consts= ', cpu.consts());
  console.log(cpu.run(3, 1));
}
}

if (1) {
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

console.log('SWAP X Y');
console.log(cpu.run(10, 1));
dump(start);
}



";
}

if ($genfun) {
    for $i (0..255) {
	my $h = sprintf('%02X', $i);
	my $f = $gendata{$h};
	print $f ? "$f" : "";
	print ",";
    }
}

# (* 4 256) = 1024 = 13 lines  ASM
# (* 49 5) = 245 = 4 lines     #  a3ASM
# (* 49 9) = 441 = 6 lines     #  0xA3:ASM,
