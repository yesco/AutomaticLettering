# mix8
$last = 0;
for $i (0..255) {
    #my ($e, $s, $v) = &mix8($i);
    #my ($e, $s, $v) = &float8($i);
    #my ($e, $s, $v) = &fint8($i);
    #my ($e, $s, $v) = &ufint8x($i);
    my ($e, $s, $v) = &foo8($i);
    #my ($e, $s, $v) = &vint8($i);
    #my ($e, $s, $v) = &uvfloat8($i);
    # NO my ($e, $s, $v) = &vfloat8($i);
    # NO my ($e, $s, $v) = &var8($i);
    $d = $v - $last;
    print sprintf("%3d", $i), " $e\t$s\t$v\t$d\n";
    $last = $v;

    my ($e, $s, $v) = &add_foo8($i, $i);
    print sprintf("===%3d", $i), " $e\t$s\t$v\n";
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
# - a single byte
# - signed float
# - comparable as unsigned byte
# - integer full precision -32..+32
# - decimal smallest abs val 0.0625
# - finally PI = 3 !
# - +inf/-inf (+247/-247)
# - signed -0 and +0
# - range -239 -- +239
# - 1.5 decimals precision! (LOL)
# - 1 sign bit
# - 3 exponent bits
# - 4 significant bits (+ 1 implied)
sub foo8 {
    my $eb = -1; #-1 seems good
    my ($i) = @_;
    
    my $neg = !($i & 128);
    $i = 255-$i if $neg;
    
    my $e = ($i >> 4) & 7;
    my $s = $i & 15;

    $s += 16; # if $e;
    
    my $ne = $e - $eb;
    my $n = $s / 32;
    my $v = $n * 2 ** $ne;

    # wtf? LOL (related to $eb...
    $v += $eb;

    $v = -$v if $neg;
    return $e, $s, $v;
}

sub add_foo8 {
    my $eb = -1; #-1 seems good
    my ($ia, $ib) = @_;
    
    my $nega = !($ia & 128);
    $ia = 255-$ia if $neg;
    
    my $negb = !($ib & 128);
    $ib = 255-$ib if $neg;
    
    my $nea = ($ia >> 4) & 7;
    my $sa = $ia & 15;

    my $neb = ($ib >> 4) & 7;
    my $sb = $ib & 15;

#    $sa += 16; # if $e;
#    $sb += 16; # if $e;
    
    my $s = $sa + $sb;
    my $e = $e;

    my $ne = $e - $eb;
    my $n = $s / 32;
    my $v = $n * 2 ** $ne;

    # wtf? LOL (related to $eb...
    $v += $eb;

    # TODO
    $v = -$v if $nega;
    
    return $e, $s, $v;
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
