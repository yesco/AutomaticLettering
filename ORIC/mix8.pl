# this is a file to test various 1 byte
# float point representations!


# fib - closed form
#
#  - https://fabiandablander.com/r/Fibonacci.html#:~:text=The%20closed-form%20expression%20of,√52)n%5D.

if (1) {
    $pi = 3.141592654;
    $ee = 2.71828182845904523536;
    $sqrt2 = 1.07611737516463775650;
    $sqrt5 = sqrt(5);
    $goldenratio = (1 + $sqrt5) / 2;

    $PIEround = 0.4; # "seems to be best"

    $method = 'pie';
    $method = 'fint16in8';
    $method = 'double64in8';
    $method = 'float32in8';
    $method = 'gr';
    $method = 'fint32in8';
    $method = 'piesq';
    $method = 'fib';
    $method = 'twofour';

    if ($method eq 'piesq') {
	# 0, 10^-12, ... -1 0 1 2 3 5 8 .. 10^12
	# this alsmost generates fib!
	# however it's coarse
	$base =  $pi/$ee*$sqrt2; # 1.24
	$base *= $base;
	$offset = 64; # 0..1
	# NOTICE: ONLY $method=1
	#   add,sub,mul: are optimzied for
    } elsif ($method eq 'fib') {
	# 0, ... 0 ... 1 1 2 
	# this alsmost generates fib!
	# however it's coarse
	# $piesq = 1.24369828222538;
	$base = 1.242;
	$base *= $base;
	$offset = 64; # 0..1
	# NOTICE: ONLY $method=1
	#   add,sub,mul: are optimzied for
    } elsif ($method eq 'pie') {
	# 0, 10^-6 ... 10^6
	# more dense around 0..10
	$base =  $pi/$ee*$sqrt2; # 1.24
	$offset = 64; # 0..1
	# TODO: new variants of add,sub,mul?
    } elsif ($method eq 'fint16in8') {
	# -inf, -32K -0, +0 +32K, +inf
	# more dense around 0..10
	$base =  1.18058;
	$offset = 64; # 0..1
	# TODO: new variants of add,sub,mul?
    } elsif ($method eq 'fint8in8') {
	# -inf -125 -0 +0 125 +inf
	# more dense around 0..10
	$base =  1.081;
	$offset = 64; # 0..1
	# TODO: new variants of add,sub,mul?
    } elsif ($method eq 'fint32in8') {
	# -inf 2e-9 -0 0 1 1.4 2 2.8 2.036e9 ... 
	# more dense around 0..10
	$base =  1.413;
	$offset = 64; # 0..1
	# TODO: new variants of add,sub,mul?
    } elsif ($method eq 'float32in8') {
	# -inf 3.39-38 -0 ... 0 4 17 73 ..
	# more dense around 0..10
	$base =  4.18285;
	$offset = 64; # 0..1
	# TODO: new variants of add,sub,mul?
    } elsif ($method eq 'double64in8') {
	# -inf -9e303 .. -0 0 1 79900 ... lol
	# more dense around 0..10
	$base =  79900;
	$offset = 64; # 0..1
	# TODO: new variants of add,sub,mul?
    } elsif ($method eq 'gr') {
	# 
	# not so special
	$base =  $goldenratio;
	$offset = 64; # 0..1
	# TODO: new variants of add,sub,mul?
    } elsif ($method eq 'twofour') {
	# -info(=-64K) ... -32K ... -16K ...
	# -1 .. 0 ... 1 .... 2 ... 4 ... 64K=inf
	#
	# 62  ...
	# 63  0.840896     1 x ...
	# 64  1            DEC STORE in 2 bytes
	# 65  1.18921      2x  1.189
	# 66  1.41421          1.414
	# 67  1.68179          1.682
	# 68  2                2.000
	# 69  2.37841      4x  2.378
	# 70  2.82843          2.828
	# 71  3.36359          3.364
	# 72  4 
	# 73  4.75683      8x  4.75(6)
	#
	# - easy to print convert to DEC!
	# - print 2 dec
	$base =  2 ** (1/4);
	$offset = 64; # 0..1
	# TODO: new variants of add,sub,mul?
    }

    print "======= Base-pow($base, $offset) ======\n";

    # - Math of addition!
    # b^n + b& n+x = b^ n+d
    #      1 + b^x = b^d
    #     ln 1+b^x = d ln b
    #            d = ln 1+b^x / ln b
    #

    print "\n\n\n";
    print "----------- addition algo ---------\n";
    print "d\t\"d\"     round\tadd\trfactor real\n";

    # - if a is biggest, to add b
    #   - return hi + add
    #   - return lo + dr

    $roundingOffset = 0.4; # not obvious!
    $equals = 0;
    $equalsStop = 10; # when have # in row
    $x = 0;
    do {
	$d = log(1 + $base ** $x) / log($base);
	$dr = int($d + $roundingOffset);
	$dd = $d - $dr;
	$ddd = $dr - $x;
	$vr = $base ** $dr;
	$v = $base ** $d;

	if ($x == $dr) {
	    print '-' x 48, "\n" unless $equals;
	    $equals++;
	} else {
	    $equals = 0;
	}

	print sprintf(
	    "$x\t%-8g  $dr\t$ddd\t%-6g %-6g\n",
	    $d, $vr, $v);

	$x++;
    } while ($equals < $equalsStop);

    # playing with the idea of exponential
    # number base... this means a floating
    # precision

    # - smooth difference between clsoe numbers
    # - multiplication becomes easy?
    # - addition a pain, but has the advantage
    #   of that near
    # - subtraction, if numbers are near, the
    #   difference can also be found!

    # this almost generates fib...
    
    # 1 .07883e-06
    # 2  1.34174e-0
    # 3  1.66872e-06
    # 4  2.07538e-06
    # 5  2.58115e-06 
    # ...

    # ...
    # 126     745302
    # 127     926931
    # 128     1.15282e+06


    print "\n\n\n";
    print "----------- number mapping check ---------\n";
    print "i\tfloat   \trev \tagain  \t\n";


    $a = 0;
    $b = 1;

    $i = 0;
    while ($i < 256) {
	# fib
	$c = $a + $b; $a = $b; $b = $c;

	# expoential base!
	$e = PIEtof($i);
	$ii = ftoPIE($e);
	$ee = PIEtof($ii);
	$iii = ftoPIE($ee);
	
	print "$i\t",
	    sprintf("%-8g\t", $e),
	    $ii,
	    sprintf("\t%-8g\t", $ee),
	    "\n";

	if ($ii != $i || $i != $iii) {
	    print "%% ERROR: ftoPIE <=> PIEtof) not congruent!\n";
	    print "i=$i ii=$ii i==$iii\n";
	}

	$i++;
    }

    print "\n\n\n--------------addition---------\n";

    print "xf yf f\t\tzf\t$x y z\n";
    for $xf (0..9) {
	print "\n";
	for $yf (0..9) {
	    $f = $xf + $yf;

	    $x = ftoPIE($xf);
	    $y = ftoPIE($yf);
	    $z = addPIE($x, $y);

	    $zf = PIEtof($z);
	    $pz = ftoPIE($f);

	    # seems like NOOP, but it's "roundong

	    $fp = ftoPIE($f);
	    $ff = PIEtof($fp);

	    print sprintf(
		"$xf*$yf=$f \t%-8g\t%-8g  $x $y:$z\n",
		$zf, $ff);

	    if ($z != $fp) {
		print "  %% --- Not same z=$z pz=$pz zf=$zf f=$f ff=$ff\n\n";
	    }
	
	}
    }
    
    print "\n\n\n--------------multiplication---------\n";

    print "xf yf f\t\tzf\t$x y z\n";
    for $xf (0..9) {
	print "\n";
	for $yf (0..9) {
	    $x = ftoPIE($xf);
	    $y = ftoPIE($yf);
	    
	    $z = mulPIE($x, $y);
	    $zf = PIEtof($z);
	    $pz = ftoPIE($x + $y);

	    $f = $xf * $yf;
	    # seems like NOOP, but it's "roundong

	    $fp = ftoPIE($f);
	    $ff = PIEtof($fp);


	    # seems like NOOP, but it's "roundong"
	    print sprintf(
		"$xf*$yf=$f \t%-8g\t%-8g  $x $y:$z\n",
		$zf, $ff);

	    if ($z != $fp) {
		print "  %% --- Not same fi=$fi pz=$pz zf=$zf f=$f ff=$ff\n";
	    }
	}
    }
    
    print "\n\n\n";

    $last = 0;
    for $i (0..255) {
	$e = PIEtof($i);
	$ii = ftoPIE($e);

	$x = $a;
	$xf = PIEtof($x);
	
	print sprintf("$i\t%-8g\t$ii\t$x\t%-8g\n", $e, $xf);
	$last = $i;
    }

    for $i (0..255) {
	$xf = int(rand(999));
	$yf = int(rand(878));

	$x = ftoPIE($xf);
	$y = ftoPIE($yf);
	
	$f = $xf + $yf;
	$z = ftoPIE($f);
	$zf = PIEtof($z);
	print "-- $xf + $yf = ", $f, sprintf(" ... %-8g ($z)\n", $zf);
	$z = $a = addPIE($x, $y);


	$f = $xf * $yf;
	$z = ftoPIE($f);
	$zf = PIEtof($z);
	print "-- $xf * $yf = ", $f, sprintf(" ... %-8g ($z)\n", $zf);
	$z = $m = mulPIE($x, $y);



	$z = $s = subPIE($x, $y);
	$z = $d = divPIE($x, $y);
	print "\n";
    }

    #   F(n) = F(n - 1) + F(n - 2)
    #
    #   S(n) = S(n - 1) + F(n - 1)
    #   S(n) = F(n + 1) - 1
    #   S(n-1) = F(n) - 1
    #   S(n-1) = F(n - 2) + F(n - 3) - 1

    # F(a) - F(b) = S(a-1) - S(b-1)
    
    #  8                 -  2  =  6
    # F(6)               - F(3)
    # F(5)        + F(4) - F(3)
    # F(4) + F(3) + F(4) - F(3)
    # 2 * F(4)
    # 2 * 3
    #   6
    #
    # f10-f7 = 55-13 = 42 = 2f8 = 2*21
    # f10-f6 =
    #

    # fn - fn-3 = 2fn-2

    # fn - fn-4
    # fn-1 + fn-2 - fn-4
    # 2fn-2 + fn-3 - fn-4
    # 2fn-2 - fn-3 

    # g = gn = fn = f(n)
    # g3 = g(-3) = f(n-3)
    # g4 = g5 + g6
    #
    # f(n) - f(n-5)
    # g0 - g5
    # g1 + g2 - g5
    # g2 + g3 + g2 - g5
    # 2g2 + g3 - g5
    # 2g3 + 2g4 + g3 - g5
    # 3g3 + 2g4 - g5
    # 3g4 + 3g5 + 2g4 - g5
    # 5g4 + 2g5
    # 5g5 + 5g6 + 2g5
    # 3g5 + 5g6 = 3f5 + 5f4 = 3*5 + 5*3 = 30
    # 3g6 + 3g7 + 5g6
    # 8g6 + 3g7
    #
    # 8*f(n-6) + 3*f(n-7)
    # f10-f5 = 55-5 = 50 = 8f(n-6)
    # => 8*3 + 3*2 = 24+6 = 30

    # f10-f5
    # 55 | 5 = 50
    # 21 34 | 5 = 50
    # 13 21 21 | 5 = 50
    # 2*21 13 | 5
    # 2*8 2*13 13 | 5
    # 2*8 3*13 | 5
    # 2*8 3*5 3*8 | 5
    # 5*8 3*5 | 5 = 50
    # 5*8 2*5 = 50
    # 5*3 5*5 2*5
    # 5*3 7*5 = 50
    # 5*3 7*3 7*2
    # 12*3 7*2 == 12*f4 + 7*f3
    # 12*2 12*1 7*2
    # 19*2 12*1 == 19*f3 + 12*f2

    # f(n)-f(n-5) == 19*f(n-7) + 12*f(n-8)

    # fn-1 + fn-2 - fn-4
    # fn-2

    # f10-f5 = 55-5 = 50 = f8 = 13 ??? 
    
    sub addPIE {
	# NOTICE: ONLY $method=1
	#   add,sub,mul: are optimzied for t
	die unless $method == 'piesq';

	my ($a, $b) = @_;
	return $b if !$a;
	return $a if !$b;

	if ($a < $b) {
	    my $t = $a;
	    $a = $b;
	    $b = $t;
	}

	# now $a >= $b
	my $d = $a - $b;
	my $r = $a;
	$r = $a+1 if $d < 4;

	# check for +inf
	return $r >= 255 ? 255 : $r;





	my $af = PIEtof($a);
	my $bf = PIEtof($b);
	my $f = $af + $bf;

	my $p = ftoPIE($f);

	my $pf = PIEtof($p);
	print sprintf(
	    "add %-6g %-6g = (%-6g) => %-6g\n",
	    $af, $bf, $f, $pf); # if 0;
	return $p, $af, $bf, $f, $pf;
    }

    sub subPIE {
	# NOTICE: ONLY $method=1
	#   add,sub,mul: are optimzied for
	die unless $method == 'piesq';

	my ($a, $b) = @_;
	return $a if !$b;

	my $d = $a - $b;
	if ($d < 0) {
	    # neg not imlemented yet
	    return -9999;
	}
	
	# this is "correct" for "fib"
	return 0 if !$d;
	return $a - 2 if $d == 1;
	return $a if $d <= 3;
	return $a;
    }

    sub negPIE {
	my ($a) =@_;
	return $a ^ 128;
    }

    sub invPIE {
	my ($a) = @_;
	return $a ^ 127; # really?
    }

    sub mulPIE {
	# NOTICE: ONLY $method=1
	#   add,sub,mul: are optimzied for t
	die unless $method == 'piesq';


	my ($a, $b) = @_;
	return 0 if !$a;
	return 0 if !$b;

	# - Math!
	# x = b ^ xp-o
	# y = b ^ yp-o
	#
	# x * y = b ^ xp-o  *  b ^ yp-o
	# ln x + ln y = (xp-o + yp-o) * ln b
        # x * y = b ^ (xp-o + xp-o);
	
	my $af = PIEtof($a);
	my $bf = PIEtof($b);
	my $f = $af * $bf;

	my $pc = ftoPIE($f);
	my $p = $a + $b - $offset;
	my $pf = PIEtof($p);
	print sprintf(
	    "mul %-6g %-6g = (%-6g) => %-6g\n",
	    $af, $bf, $f, $pf); # if 0;
	return $p, $af, $bf, $f, $pf;
	
    }
    sub divPIE {
	# NOTICE: ONLY $method=1
	#   add,sub,mul: are optimzied for t
	die unless $method == 'piesq';

	my ($a, $b) = @_;
	return 0 if !$a;
	
    }
    
    sub PIEtof {
	my ($i) = @_;
	return 0 if !$i;

	return $base ** ($i - $offset);
    }
    
    sub ftoPIE {
	my ($f) = @_;
	return 0 if !$f;

	# - Math!
	# f = b ^ p-o
	# ln f = ln  b ^ p-o
	# p = ln f / ln b + o

	return int(log($f)/log($base)
		   + $offset + $PIEround);
    }

    exit
}

#########################################
# more traditional ipmlementations

# mix8
$last = 0;
for $i (0..255) {
    #my ($e, $s, $v) = &mix8($i); # - crap
    #my ($e, $s, $v) = &float8($i); # - crap
    #my ($e, $s, $v) = &fint8($i); # 0..15K
    my ($e, $s, $v) = &ufint8x($i); # 0..8K
    #my ($e, $s, $v) = &foo8($i); # - good!
    #my ($e, $s, $v) = &foo8x($i);
    #my ($e, $s, $v) = &vint8($i); # crap
    #my ($e, $s, $v) = &uvfloat8($i); # 0..1..490
    # NO my ($e, $s, $v) = &vfloat8($i);
    # NO my ($e, $s, $v) = &var8($i);
    $d = $v - $last;
    print sprintf("%3d", $i), " $e\t$s\t$v\t$d\n";

    #my ($e, $s, $v) = &foo8(255-$i); check neg
    #print sprintf("%3d", $i), " $e\t$s\t$v\t$d\n";
    $last = $v;

    my ($e, $s, $v) = &add_foo8($i, $i);
    print sprintf("===%3d", $i), " $e\t$s\t$v\t(", $last+$last, ")\n";
}

# erronious
sub mix8err {
    my ($i) = @_;

    # precise int
    return $i if $i < 128;

    # choice no negative?
    #if ($i == 128) return '-inf';
    return 'overflow' if $i == 255;
    
    # varying precison: 3 bitsi
    my $e = ($i & 127) >> 4;
    my $s = ($i & 15) | 16; # implied

    my $v = $s * 2 ** (2 ** $e);
    
    return $e, $s, $v;
}

# staged mixed precision
# each top bit set multiplies
# the step
sub mix8 {
    my ($i) = @_;

    my $v = $i;
    my $e = 0;
    my $s = 0;
    while ($i & 128) {
	$e++;
	$i = $i & 127;
	$v += $i << ($e*4);
	$i *= 2;
    }

    return $e, $s, $v;
}

# varying bits 
sub var8 {
    my $eb = 3;
    my ($i) = @_;
    return (0,0,0) if !$i;
    
    my $bits = ($i >> 6); # 0-3
    my $emax = 1 << $bits;
    return $bits, $emax, 0;
}

# 0..248 with decimals
sub float8 {
    my $eb = 0;
    my ($i) = @_;

    return (0, 0, 0) if !$i;
    
    my $neg = $i & 128;
    my $e = (($i & 127) >> 4);
    my $s = $i & 15;
    $s += 16 if $e;
    my $n = $s / 16;
    my $v = $n * (2 ** $e);
    
    return $e, $s, $v;
}

# nice 0..63488 (w decimal)
sub ufloat8 {
    my $eb = 0;
    my ($i) = @_;
    return (0, 0, 0) if !$i;
    
    my $e = $i >> 4;
    my $s = $i & 15;
    $s += 16 if $e;
    my $n = $s / 16;
    my $v = $n * (2 ** $e);
    
    return $e, $s, $v;
}

# 0..496 (w higher precision decimal
# e=4 s=4 decimal
# nah
sub uvfloat8 {
    my $eb = 7;
    my ($i) = @_;
    return (0, 0, 0) if !$i;
    
    my $e = ($i >> 4) - $eb;
    my $s = $i & 15;
    $s += 16 if $e;
    my $n = $s / 16;
    my $v = $n * (2 ** $e);
    
    return $e, $s, $v;
}

# 0..496 (w higher precision decimal
# signed e=3 s=4
sub vfloat8 {
    my $eb = 7;
    my ($i) = @_;
    return (0, 0, 0) if !$i;
    
    my $neg = $i & 128;
    my $e = (($i & 127) >> 4) - $eb;
    my $s = $i & 15;
    $s += 16 if $e;
    my $n = $s / 16;
    my $v = $n * (2 ** $e);
    
    $v = -$v if $neg;
    return $e, $s, $v;
}

# unsigned varying precision int
# (i.e. float point integer?)
# 0..1015808
sub vint8 {
    my $eb = 0;
    my ($i) = @_;
    return (0, 0, 0) if !$i;
    
    my $e = $i >> 4;
    my $s = $i & 15;
    $s += 16 if $e;
    my $n = $s;
    my $v = $n * (2 ** $e);
    
    return $e, $s, $v;
}

# 0..15782 decimals 0.015625
sub fint8 {
    my $eb = 6;
    my ($i) = @_;
    return (0, 0, 0) if !$i;
    
    my $e = $i >> 4;
    my $s = $i & 15;
    $s += 16 if $e;
    my $n = $s;
    my $v = $n * (2 ** ($e - $eb));
    
    return $e, $s, $v;
}

# unsigned decimals
# 0..7936
sub ufint8x {
    my $eb = 7;
    my ($i) = @_;
    return (0, 0, 0) if !$i;
    
    my $e = $i >> 4;
    my $s = $i & 15;
    $s += 16 if $e;
    my $n = $s;
    my $v = $n * (2 ** ($e - $eb));
    
    return $e, $s, $v;
}

# signed decimals
# -247..247 w smallest nz abs 0.0625
#
# Floating Ordered Osigned 8-bit
# 
# Features:
# - almost IEEE(1, 3, 4, -1, 1.5)
# - a single byte
# - signed float
# - comparable as unsigned byte
# - negation by xor (hmmm)
# - integer full precision -32..+32
# - decimal smallest abs val 0.0625
# - finally PI = 3 !
# - +inf/-inf (+247/-247)
# - signed -0 and +0
# - range -239 -- +239
# - 1 sign bit
# - 3 exponent bits
# -   -1 offset!
# - 4 significant bits (+ 1 implied)
# - 1.5 decimals precision! (LOL)
# - no NaN unless waste values?
#   (or no +0/-0 ?)
sub foo8 {
    my $eb = -1; #-1 seems good
    my ($i) = @_;
    
    if ($i == 127 || $i == 128) {
	return 0,0,0;
    }

    my $neg = !($i & 128);
    $i = 255-$i if $neg;
    
    my $e = ($i >> 4) & 7;
    my $s = $i & 15;
    my $ss = $s;
    
    my $ne = $e - $eb;

    $s += 16;
    
    my $n = $s / 32;
    my $v = $n * 2 ** $ne;

    # wtf? LOL (related to $eb...
    $v += $eb;

    $v = -$v if $neg;
    return $e, $s, $v, $i, $neg, $ne, $ss;
}

# not working correctly :-(
sub add_foo8 {
    my $eb = -1; #-1 seems good

    my ($a, $b) = @_;
    my ($ae, $as, $av, $ai, $aneg, $ane, $ass)= foo8($a);
    my ($be, $bs, $bv, $bi, $bneg, $bne, $bss)= foo8($b);

    # make a wish
    my $neg = $aneg; # not correct...
    my $rv = $av + $bv;

    my $s;
    if ($ae == $be) {
	$s = $ass + $bss;
    } else {
	print "%% ERROR: not implented\n";
	if (abs($ae-$be) >= 4) {
	    # TODO: return biggest abs
	} else {
	    # TODO: shift to same dignity

	    $s = $ass + $bss;
	}
    }

    $s = 0 if $s == -32;
    my $e = $ae;
    my $ne = $e - $eb;
    print "(= $e $s =)";

    $s += 16;

    my $n = $s / 32;
    my $v = $n * 2 ** $ne;

    $v += $eb;
    $v = -$v if $neg;
    return $e, $s, $v, $i, $neg, $ne;
}

sub foo8x {
    my $eb = -1; #-1 seems good
    my $em = 2;
    
    my ($i) = @_;
    
#    if ($i == 127 || $i == 128) {
#	return 0,0,0;
#    }

    my $neg = !($i & 128);
    $i = 255-$i if $neg;
    
    my $e = ($i >> 4) & 7;
    my $s = $i & 15;
    my $ss = $s;
    
    my $ne = $e - $eb;

    $s += 16;

    my $n = $s / 32;
    my $v = $n * 2 ** ($ne * $em);

    # wtf? LOL (related to $eb...
    $v += $eb;

    $v = -$v if $neg;
    return $e, $s, $v, $i, $neg, $ne, $ss;
}

# errornoious no ! and big step
sub foo8orig {
    my $eb = 4;
    my ($i) = @_;
    
    my $neg = !($i & 128);
    $i = 255-$i if $neg;
    
    my $e = ($i >> 4) & 7;
    my $s = $i & 15;
    $s += 16 if $e;
    my $n = $s;
    my $v = $n * (2 ** ($e - $eb));
    
    $v = -$v if $neg;
    return $e, $s, $v;
}

# -1..0..+1 !!!!
sub one8 {
    my $eb = 7;
    my ($i) = @_;
    
    my $neg = !($i & 128);
    $i = 255-$i if $neg;
    
    my $e = ($i >> 4) & 7;
    my $s = $i & 15;

    $s += 16; # if $e;
    
    my $n = $s / 32;
    my $v = $n * (2 ** ($e - $eb));
    
    $v = -$v if $neg;
    return $e, $s, $v;
}

# 0	0.000001	0.00000
