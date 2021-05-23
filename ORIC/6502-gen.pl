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
    # zpy is zpx but for STX it's senseless
    'zpx', '(m[pc++] + x) & 0xff',
    'zpy', '(m[pc++] + y) & 0xff', 
    'abs_', 'w((pc+=2)-2)',
    'absx', 'w((pc+=2)-2) + x',
    'absy', 'w((pc+=2)-2) + y',
    'zpi',  'wrap(m[pc++])',
    'zpxi', 'wrap(m[pc++ + (x & 0xff)])',
    'zpiy', 'wrap(m[pc++] + y)',
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
    'lda', 'z(v= a= MEM])',
    'ldx', 'z(v= a= MEM])',
    'ldy', 'z(v= a= MEM])',

    'sta', 'v= MEM= a',
    'stx', 'v= MEM= x',
    'sty', 'v= MEM= y',
    'stz', 'v= MEM= 0', # 6502C

    'and', 'v= n(z(a &= MEM))',
    'eor', 'v= n(z(a ^= MEM))',
    'ora', 'v= n(z(a |= MEM))',

# TODO: check how c() is implemented!
# C	Carry Flag	Set if A >= M
#  uint16_t result = regs.y - mem_read(addr);
#
#  regs.p.c = result > 255;
    'cmp', 'v= n(z(c( a - MEM )))',
    'cpx', 'v= n(z(c( x - MEM )))',
    'cpy', 'v= n(z(c( y - MEM )))',

    'asl',   'v= m[ADDR]= n(z(c( m[ADDR] << 1 )))',
    'asl_a', 'v= a      = n(z(c( a       << 1 )))',

    'lsr',   'v= n(z( m[ADDR] = sc(m[ADDR]) >> 1))',
    'lsr_a', 'v= n(z(       a = sc(a)       >> 1 ))',

    'rol',   'v= m[ADDR] = n(z(c(m[ADDR]<<1 + (p&C))))',
    'rol_a', 'v= a       = n(z(c(      a<<1 + (p&C))))',

    'ror',    'v= m[ADDR] = n(z( sc( m[ADDR] | ((p&C)<<8) ))',
    'ror_a',  'v= a       = n(z( sc( a       | ((p&C)<<8) ))',

    'adc', 'adc(MEM)',
    'sbc', 'adc(~MEM)', # lol

    # notice B.. uses signed byte!
    'bra', '              pc += RMEM', # 6502C

    'bpl', 'if (~p & N ) pc += RMEM',
    'bvc', 'if (~p & V ) pc += RMEM',
    'bcc', 'if (~p & C ) pc += RMEM',
    'bne', 'if (~p & Z ) pc += RMEM',

    'bmi', 'if ( p & N ) pc += RMEM',
    'bvs', 'if ( p & V ) pc += RMEM',
    'bcs', 'if ( p & C ) pc += RMEM',
    'beq', 'if ( p & Z ) pc += RMEM',
    
# BIT - Bit Test
# A & M, N = M7, V = M6
#
# This instructions is used to test if one or more bits are set in a target memory location. The mask pattern in A is ANDed with the value in memory to set or clear the zero flag, but the result is not kept. Bits 7 and 6 of the value from memory are copied into the N and V flags.
#
# jsk: not clear: 76 from memory are copied or from the combined result?

    'bit', 'v= z( m6v(n(m[ADDR])) & a)',
#    'bit', 'v= m6m7(n(z(m[ADDR])))',

    'nop', '',

    # it seems assumed pc points to next memory
    # location. Hmmm. Maybe change that???

    'jmp',   'pc = ADDR',
    'jmp_i', 'pc = w(ADDR)',
    'jsr', 'pc--; push( pc >> 8); push( pc & 0xff); pc = ADDR',

    'brk', 'push(pc >> 8); push(pc & 0xff); b(1); pc = w(0xfffe)',
    'rts', 'pc = pop(); pc += pop()<<8',
    'rti', 'pc = pop(); pc += pop()<<8; p = pop()',

    'php', 'v= push(p | 0x30)',
    'pha', 'v= push(a)',

    'phx', 'v= push(x)', # 6502C
    'phy', 'v= push(y)', # 6502C
    
    'plp', 'v= p= pop()',
    'pla', 'v= a= pop()',
    'plx', 'v= x= pop()', # 6502C
    'ply', 'v= y= pop()', # 6502C

    # cleverly (a=777) returns 777,
    # even if a is byte from byte array
    'dec', 'v= n(z( --m[ADDR] ))',
    'dea', 'v= n(z( --a ))', # 6502C
    'dex', 'v= n(z( --x ))',
    'dey', 'v= n(z( --y ))',

    'inc', 'v= n(z( ++m[ADDR] ))',
    'ina', 'v= n(z( ++a ))', # 6502C
    'inx', 'v= n(z( ++x ))',
    'iny', 'v= n(z( ++y ))',

    'clc', 'v= p &= ~C',
    'cli', 'v= p &= ~I',
    'clv', 'v= p &= ~V',
    'cld', 'v= p &= ~D',

    'sec', 'v= p |= C',
    'sei', 'v= p |= I',
    'sed', 'v= p |= D',

    'txa', 'z(v= a= x)',
    'tya', 'z(v= a= y)',
    'txs', 'z(v= s= x)',
    'tay', 'z(v= y= a)',
    'tax', 'z(v= a= x)',
    'tsx', 'z(v= x= s)',
);

# prelude w wrappings

print "
// Generated 6502(C) simulator
//
// (\"C\") 2021 Jonas S Karlsson
//
//       jsk@yesco.org

function CPU6502() { // generates one instance

const NMI = 0xfffa, RESET = 0xfffc, IRQ   = 0xfffe;

// registers & memory
let a = 0, x = 0, y = 0, p = 0, s = 0, pc = 0;
let m = uint8array(0xffff + 1);

// w() - read a word 
w      = (a) => m[a] + m[a+1]<<8;
wrap = (a) => m[a] + m[(a+1] & 0xff]<<8;
// TODO: why not always use wraparound?

push = (v) => m[0x100 + s--] = v;
pop  = ( ) => m[0x100 + ++s];

let C = 0x01, Z = 0x02, I = 0x04, D = 0x08;
let B = 0x10, Q = 0x20, V = 0x40, N = 0x80;

// set flag depending on value
z = (v)=> (p^= Z & (p^(v&0xff?0:Z)), v);
n = (v)=> (p^= N & (p^ v)          , v);
c = (v)=> (p^= C & (p^ (v > 255))  , v & 0xff);
i = (v)=> (p^= I & (p^ (v * I)     , v);
b = (v)=> (p^= B & (p^ (v * B)     , v);
v = (v)=> (p^= V & (p^ (v * V)     , v);

// set carry if low bit set (=C!)
sc =(v)=> (p^= C & (p^ v),         , v);

function adc(v) {
    let oa = a;
    c(a += v + (p & C));
    v((oa^a) & (v^a));
    if (p & D) {
	c(0);
	if ((a & 0x0f) > 0x09) {
	    a += 0x06;
	}
	if ((a & 0xf0) > 0x90) {
	    a += 0x60;
	    sc(1);
	}
    }
}

let op, ipc, cpu, d, n, v, q; // Dutch joke?

function tracer() {
}

function run(count = -1, trace = 0) {
  trace = 1==trace ? tracer : trace;
  while(count--) {
    ipc = pc; addr = arg = undefined; 
    switch( op=m[pc++] ) {
";


my @modes = (
#    'zpxi', 'zp', 'imm', 'abs',
#    'zpiy', 'zpx', 'absy', 'absx');
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

    my $x, $n, $m = '-';;

    
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
$c6502 = ' 72 32 80 D2 52 B2 12 F2 92 64 74 9C 9E 14 1C 04 0C ';

# generate instructions
open IN, "op-mnc-mod.lst" or die "bad file";
my @ops, %mnc, %mod;
while (<IN>) {
    my ($op, $mnc, $mod) =/^(..) (\w+) ?(|\w*)$/;
    die "no op: $_" unless $op;

    next if $c6502 =~ /$op/;

    my $line = "    case 0x$op: ";

    # TODO: test if mod aggrees w mmm bits?
    if ($mod =~ /\w/) {
	my ($v, $iii, $mmm, $cc, $x, $n, $m) = &decode($op); 
	my $neq = ($mnc eq $n) ? '=' : ' ';
	my $meq = ($mod eq $m) ? '==' : '  ';
	if (!$neq || !$meq) {
	    print "Decoding error!\n";
	    print "= $op $mnc $neq $n $iii $cc     $mmm $mod $meq $m\n";
	}
    }

    # address stuff
    my $i = $impl{$mnc};
    $i =~ s/RMEM/MEM -128/;
    $i =~ s/MEM/m[$modes{$mod}]/;
    if ($i =~ /ADDR/) {
	$i = 'd='.$modes{$mod}.'; ';
	$i =~ s/ADDR/d/g;
    }
    die "MEM:only use once:$i" if $i =~ /MEM/;
    $i =~ s/ +/ /g;
    $line .= $i.'; ';

    my $wid = 55;
    print sprintf("%-${wid}s", $line);
    #print '----LINE TOO LONG: ', length($line), "\n" if length($line) > $wid;

    if (1) {
	print "n='$mnc';";
	print "q='$mod';" if $mod;
	print "break;"
    } else {
	print "break;// $mnc $mod\n";
    }
    print "\n";
}

# prelude
print "    }
    trace && trace(cpu, { count, ipc, op, mnc, mod, addr, g, v} );
  }
  
  return cpu = {
    run,
    state() { return { a, x, y, p, pc, s, m } },
    last() { return { pc, op, addr, arg } },
    reg(n, v) { return eval(n+(typeof a?'':'='+v))},
    consts() { return { NMI,RESET,IRQ, C,Z,I,D, B,Q,V,N } },
    dis,
  }
}
";
