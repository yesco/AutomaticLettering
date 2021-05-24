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
%modes = (
    'imm', 'pc++',
    'zp',  'm[pc++]',
     #zpy is zpx but for STX it's senseless
    'zpx', '((m[pc++] + x) & 0xff)',
    'zpy', '((m[pc++] + y) & 0xff)', 
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
    'lda', 'z(g= a= MEM)',
    'ldx', 'z(g= a= MEM)',
    'ldy', 'z(g= a= MEM)',

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
    'cmp', 'g= n(z(c( a - MEM )))',
    'cpx', 'g= n(z(c( x - MEM )))',
    'cpy', 'g= n(z(c( y - MEM )))',

    'asl',   'g= m[ADDR]= n(z(c( m[ADDR] << 1 )))',
    'asl_a', 'g= a      = n(z(c( a       << 1 )))',

    'lsr',   'g= n(z( m[ADDR] = sc(m[ADDR]) >> 1))',
    'lsr_a', 'g= n(z(       a = sc(a)       >> 1 ))',

    'rol',   'g= m[ADDR] = n(z(c(m[ADDR]<<1 + (p&C))))',
    'rol_a', 'g= a       = n(z(c(      a<<1 + (p&C))))',

    'ror',    'g= m[ADDR] = n(z( sc( m[ADDR] | ((p&C)<<8) )));',
    'ror_a',  'g= a       = n(z( sc( a       | ((p&C)<<8) )))',

    'adc', 'adc(MEM)',
    'sbc', 'adc(~MEM)', # lol

    # notice B.. uses signed byte!
    'bra', '              pc += RMEM', # 6502C

    'bpl', 'if (~p & N) pc += RMEM',
    'bvc', 'if (~p & V) pc += RMEM',
    'bcc', 'if (~p & C) pc += RMEM',
    'bne', 'if (~p & Z) pc += RMEM',

    'bmi', 'if (p & N) pc += RMEM',
    'bvs', 'if (p & V) pc += RMEM',
    'bcs', 'if (p & C) pc += RMEM',
    'beq', 'if (p & Z) pc += RMEM',
    
# BIT - Bit Test
# A & M, N = M7, V = M6
#
# This instructions is used to test if one or more bits are set in a target memory location. The mask pattern in A is ANDed with the value in memory to set or clear the zero flag, but the result is not kept. Bits 7 and 6 of the value from memory are copied into the N and V flags.
#
# jsk: not clear: 76 from memory are copied or from the combined result?

    'bit', 'g= z( m6v(n(m[ADDR])) & a)',
#    'bit', 'g= m6m7(n(z(m[ADDR])))',

    'nop', '',

    # it seems assumed pc points to next memory
    # location. Hmmm. Maybe change that???

    'jmp',   'pc= ADDR',
    'jmpi',  'pc= w(ADDR)',
    'jsr', 'pc--; push(pc >> 8); push(pc & 0xff); pc= ADDR',

    'brk', 'push(p); push(pc >> 8); push(pc & 0xff); p|= B; pc = w(0xfffe)',
    'rts', 'pc = pop(); pc += pop()<<8',
    'rti', 'pc = pop(); pc += pop()<<8; p = pop()',

    'php', 'push(g= p | 0x30)',
    'pha', 'push(g= a)',

    'phx', 'push(g= x)', # 6502C
    'phy', 'push(g= y)', # 6502C
    
    'plp', 'g= p= pop()',
    'pla', 'g= a= pop()',
    'plx', 'g= x= pop()', # 6502C
    'ply', 'g= y= pop()', # 6502C

    # cleverly (a=777) returns 777,
    # even if a is byte from byte array
    'dec', 'g= n(z(--m[ADDR]))',
    'dea', 'g= n(z(a= (a-1) & 0xff))', # 6502C
    'dex', 'g= n(z(x= (x-1) & 0xff))',
    'dey', 'g= n(z(y= (y-1) & 0xff))',

    'inc', 'g= n(z(++m[ADDR]))',
    'ina', 'g= n(z(a = (a+1) & 0xff))', # 6502C
    'inx', 'g= n(z(x = (x+1) & 0xff))',
    'iny', 'g= n(z(y = (y+1) & 0xff))',

    'clc', 'g= p &= ~C',
    'cli', 'g= p &= ~I',
    'clv', 'g= p &= ~V',
    'cld', 'g= p &= ~D',

    'sec', 'g= p |= C',
    'sei', 'g= p |= I',
    'sed', 'g= p |= D',

    'txa', 'z(g= a= x)',
    'tya', 'z(g= a= y)',
    'txs', 'z(g= s= x)',
    'tay', 'z(g= y= a)',
    'tax', 'z(g= a= x)',
    'tsx', 'z(g= x= s)',
);

# prelude w wrappings

print "
// Generated 6502(C) simulator
//
// (\"C\") 2021 Jonas S Karlsson
//
//       jsk@yesco.org

function CPU6502() { // generates one instance

// registers & memory
var a = 0, x = 0, y = 0, p = 0, s = 0, pc = 0;
let m = new Uint8Array(0xffff + 1);
const NMI = 0xfffa, RESET = 0xfffc, IRQ   = 0xfffe;

let w    = (a) => m[a] + m[(a+1) & 0xff]<<8,
    push = (v) => m[0x100 + s--]= v,
    pop  = ( ) => m[0x100 + ++s];

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

let op /* Dutch! */, ic = 0, ipc, cpu, d, mnc, g, q;

function tracer() {
}

function run(count = -1, trace = 0) {
  trace = 1==trace ? tracer : trace;
  let t = count;
  while(t--) {
    ic++; ipc = pc; mod = d = g = undefined;
    switch(op= m[pc++]) {
";


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

open IN, "op-mnc-mod.lst" or die "bad file";
my @ops, %mnc, %mod, %saved;
while (<IN>) {
    my ($op, $mnc, $mod) =/^(..) (\w+) ?(|\w*)$/;
    die "no op: $_" unless $op;

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
	unless ($mod eq $modes[$mmm]) {
	    print "    // MODE $mod instead of of mod[mmm] $mod[$mmm]\n";
	}

    }

    # address stuff
    my $i = $impl{$mnc};
    #print "/y $op $i\n";
    $i =~ s/RMEM/MEM -128/;
    $i =~ s/MEM/m[$modes{$mod}]/;
    if ($i =~ /ADDR/) {
	$i = 'd='.$modes{$mod}."; $i";
	$i =~ s/ADDR/d/g;
    }
    die "MEM:only use once:$i" if $i =~ /MEM/;
    $i =~ s/ +/ /g;
    #print "\\y $op $i\n";

    $line .= $i.'; ';

    my $wid = 55;

    if (0) { # format
	print sprintf("%-${wid}s", $line);
    } else { # plain
	print $line;
    }
    #print '----LINE TOO LONG: ', length($line), "\n" if length($line) > $wid;

    if ($debuginfo) {
	print "f='$mnc';";
	print "q='$mod';" if $mod;
	print "break;"
    } else {
	print "break;// $mnc $mod\n";
    }
    print "\n";
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
      case 0: d= op&1 ? (m[pc++] + x)& 0xff : pc++; break; q='imm/zpx';break;
      case 1: d= m[pc++]; q='zp';break; // zp
      case 2: d= op&1 ? pc++ : 0; q='acc/imm';break; // 1=imm 0=acc
      case 3: d= pc; pc+= 2; q='abs';break; // abs
      case 4: d= w(m[pc++] + y); q='zpiy';break; // zpiy
      case 5: d= (m[pc++] + x) & 0xff; q='zpx';break; // zpx
      case 6: d= w(pc) + y; pc+= 2; q='absy';break; // absy
      case 7: d= w(pc) + x; pc+= 2; q='absx';break; // absx
      }
";

    # print generic instructions
    print "      switch(i= (op>>5) + ((op&3)<<3)) {\n";

    foreach $inst (sort { $saved_x{$a} <=> $saved_x{$b} } keys %saved) {
	my $iiiii = sprintf("0x%02x", $saved_x{$inst});
	my $mod = $saved{$inst};

	# instruction
	my $i = $impl{$inst};
	$i =~ s/MEM/v/;
	if ($i =~ /ADDR/) {
	    $i =~ s/ADDR/d/g;
	    die "MEM:only use once:$i" if $i =~ /MEM/;
	    $i =~ s/ +/ /g;
	}
#	print "      // IMPL: $impl{$inst}\n";
#	print "      // $saved{$inst}\n";
#	print sprintf("      // if (%#2x & mod) {...\n", $saved_m{$inst});
	if ($debuginfo) {
	    print "      case $iiiii: $i; f='$inst'; break;\n";
	} else {
	    print "      case $iiiii: $i; break; // $inst\n";
	}
    }

#    print "      }\n";
    print "      }\n";

}

# postlude
print "    }

    trace && trace(cpu, { ic, ipc, op, f, mod, add: dr, val: g} );
  }
}
  
return cpu = {
  run, // dis
  state() { return { a, x, y, p, pc, s, m, ic}},
  last() { return { pc, op, addr: d, arg: g, val: g}},
  reg(n, v) { return eval(n+(typeof a?'':'='+v))},
  consts() { return { NMI,RESET,IRQ, C,Z,I,D, B,Q,V,N}}

}
}

";

if (1) {
    print "

// testing
let cpu = CPU6502();
let n = 3;
while (n--) {
  console.log('cpu= ', cpu);
  console.log('state= ', cpu.state());
  console.log('state= ', cpu.last());
  console.log('consts= ', cpu.consts());
  console.log(cpu.run(1));
}
";
}

    
