# usage:
#   perl draw.pl 24 80 c x

# constants

$term_curoff = '[?25l';
$term_curon = '[?25h';
$term_home = '[0;0H';#
$term_g10x10 = '[10;10H';
$term_rev = '[30;47m';
$wideA ='Ａ';
$wide40 = 'ＡＢＣＤＥＡＢＣＤＥＡＢＣＤＥＡＢＣＤＥＡＢＣＤＥＡＢＣＤＥＡＢＣＤＥＡＢＣＤＥ';

$space = ' ';

# parse args

my $yw = shift @ARGV;
my $xw = shift @ARGV;

my $f = shift @ARGV;

# extra format argument
if ($f eq 'n') {
    $linenums = 1;
    $f = shift @ARGV;
}

if ($f eq 'z') {
    $zig = 1;
    $f = shift @ARGV;
}

if ($f eq 'w') {
    $wideon = 1;
    $c = $wideA;
    $space = ' '; # two spaces, lol
    $f = shift @ARGV;
}

if ($f eq 'g') {
    $wideon = 1;
    $c = "▀";
    $space = ' '; # two spaces, lol
    $f = shift @ARGV;
}

if ($f eq 'c') {
    $c = shift @ARGV;
    $x = shift @ARGV;
}


# draw

for $y (0..$yw-1) {
    my $startx = 0;
    if ($linenums) {
	$startx = 4;
	print sprintf("%4d", $y);
	print sprintf("%4d", $y) if $wideon;
    }
    for $x ($startx..$xw-1) {
	if ($zig && (($x+$y+1) % 10)) {
	    print $space;
	    next;
	}
	    
	if ($c eq 'c') { print $c; }
	else { print $c; }
    }
    print "\n";
}
