# mix8

for $i (0..255) {
    print "$a\t", &mix8($i), "\n";
}

sub mix8 {
    my $i = @_;

    # precise int
    if ($i < 128) return $i;

    # choice no negative?
    #if ($i == 128) return '-inf';
    if ($i == 255) return '+overflow';
    
    # varying precison: 3 bitsi
    my $e = ($i & 127) >>> 4;
    my $s = ($i & 15) | 16; # implied

    my $v = $s * 2 ** $e;
    
    return $v, $e, $s;
}
