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
    'cmx', 'v= n(z(c( x - MEM )))',
    'cmy', 'v= n(z(c( y - MEM )))',

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

function CPU6502() {

const NMI_VECTOR   = 0xfffa;
const RESET_VECTOR = 0xfffc;
const IRQ_VECTOR   = 0xfffe;

// registers & memory
let a = 0, x = 0, y = 0, p = 0, s = 0, pc = 0;
let m = uint8array(0xffff + 1);

// w() - read a word 
w      = (a) => m[a] + m[a+1]<<8;
wrap = (a) => m[a] + m[(a+1] & 0xff]<<8;
// TODO: why not always use wraparound?

push   = (v) => m[0x100 + s--] = v;
pop    = ( ) => m[0x100 + ++s];

let C = 0x01, Z = 0x02, I = 0x04, D = 0x08;
let B = 0x10, Q = 0x20, V = 0x40, N = 0x80;

// set flag depending on value
z = (v)=> (p ^= Z & (p ^ (v ? 0 : Z)), v);
n = (v)=> (p ^= N & (p ^ v)          , v);
c = (v)=> (p ^= C & (p ^ (v > 255))  , v & 0xff);
i = (v)=> (p ^= I & (p ^ (v * I)     , v);
b = (v)=> (p ^= B & (p ^ (v * B)     , v);
v = (v)=> (p ^= V & (p ^ (v * V)     , v);

// set carry if low bit set (=C!)
sc = (v)=> (p ^= C & (p ^ v),        , v);

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

# generate instructions
open IN, "op-mnc-mod.lst" or die "bad file";
my @ops, %mnc, %mod;
while (<IN>) {
    my ($op, $mnc, $mod) =/^(..) (\w+) ?(|\w*)$/;
    die "no op: $_" unless $op;

    # TODO: test if mod aggrees w mmm bits?
    my $line = "    case 0x$op: ";

    if ($mod =~ /\w/) {
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
