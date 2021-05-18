open IN, "sort asm.opcodes |" or die "nmo file";

while (<IN>) {
    while (s:=\s(\S+)\s*(\S\S)::) {
	my ($name, $op) = ($1, $2);
	#print "--- $name $op\n";

	my ($nname, $nop, $nrop, $nmode, $nbytes, $ncycles) =
	    dataFromName($name);
	print "N $op\t$nname\t$nop $nrop,\t$nmode\t$nbytes  $ncycles\n";
	my ($oname, $oop, $orop, $omode, $obytes, $ocycles) =
	    dataFromOP($op);
	print "O $op\t$oname\t$oop $orop\t$omode\t$obytes  $ocycles\n";
	print "- $op ------\n";
    }
}

sub dataFromOP {
    my $name = '-';
    my ($op) = @_;
    my $mode = "-";
    my $bytes = "-";
    my $cycles = "-";

    my $h = $1 if $op =~ /^(.)/;
    my $l = $1 if $op =~ /(.)$/;
    
    my $hn = hex($h);
    my $ln = hex($l);
    
    $mode = "A" if $l ge 'c' || $l eq '9';
    $mode = "" if $l =~ /[8a]/; # implicit
    $mode = "I" if $op eq '6c'; # JMPI
    $mode = "Z" if $l =~ /[456]/;

    my $ix = '';
    
    $mode = "I" if $l eq '1';
    
    my $odd = $hn & 1;
    if ($l eq '0') {
	if ($odd) {
	    $mode = ''; # relative *
	} elsif ($h gt '8') {
	    $mode = '#';
	} elsif ($h eq '2') {
	    $mode = 'A';
	} else {
	    $mode = ''; # implicit
	}
    } elsif ($l eq '9') {
	$mode = $odd ? "AY" : "#";
    } elsif ($op eq 'be') {
	$ix = 'Y';
    } elsif ($l eq '1') {
	$mode = "I";
	$ix = $odd ? 'Y' : 'X';
    } elsif ($odd) {
	# l: 14569de

	# ,X
	$ix = 'X' if $l =~ /[56de]/;

	# ,Y
	$ix = 'Y' if $l =~ /[1]/;
	$ix = 'Y' if $op =~ /(96|b6)/;
    } else {
    }

    $name = guessNameFromOP($op, $h, $l, $hn, $ln, $odd);

    $mode = "#" if $op =~ /(a0|c0|.2)/;

    $mode .= $ix;
    $name .= $mode;
    
    my $rop = substr($op,1,1).substr($op,0,1);
    return ($name, $op, $rop, $mode, $bytes, $cycles);
}

sub guessNameFromOP {
    my ($op, $h, $l, $hn, $ln, $odd) = @_;
    my $name = '-';
    
    my $bitcpx = 'BITJMPSTYLDYCPYCPX';
    
    my $half = int($hn/2);
    if ($l eq '0') {
        if ($odd) {
	    # Branch
	    $name = 'B' . substr('PLMIVCVSCCCSNEEQ', $hn-1, 2);
	} elsif ($hn <= 8) {
	    $name = substr('BRKJSRRTIRTS', $half*3, 3);
	} else {
	    $name = substr($bitcpx, ($half-6)*3, 3);
	}
    } elsif ($l eq '8') {
	$name = substr('PHPCLCPLPSECPHACLIPLASEIDEYTYATAYCLVINYCLDINXSED', $hn*3, 3);
    } elsif ($l =~ /[159d]/) {
	$name = substr('ORAANDEORADCSTALDACMPSBC', $half*3, 3);
    } elsif ($l =~ /[4c]/) {
	$name = substr($bitcpx, ($half-1)*3, 3);
    } elsif ($l =~ /[6ae]/) {
	if ($hn < 8) {
	    $name = substr('ASLROLLSRROR', $half*3, 3);
	} else { # hn >= 8
	    if ($l eq 'a') {
		$name = substr('TXATXSTAXTSXDEX---NOP---', ($hn-8)*3, 3);
	    } elsif ($l =~ /[26e]/) {
		$name = substr('STXLDXDECINC', ($half-4)*3, 3);
	    }
	}
    } else {	
	# guess
	$name = $guessop{'0'};
    }

    return $name;
}

sub dataFromName {
    my ($name) = @_;
    my $op = '-';
    my $mode = "-";
    my $bytes = "-";
    my $cycles = "-";
    if (length($name) == 3) {
	if ($name =~ /^B/) {
	    # branches
	    $mode = "*"; # rel
	    $bytes = 2;
	    $cycles = "2+1+2";
	} elsif ($name =~ /^PL/) {
	    # stack PULL
	    $mode = ""; # impl
	    $bytes = 1;
	    $cycles = "4";
	} elsif ($name =~ /^P/) {
	    # stack PUSH
	    $mode = ""; # impl
	    $bytes = 1;
	    $cycles = "3";
	} elsif ($name =~ /^BRK/) {
	    # RTS/RTI
	    $mode = ""; #impl
	    $bytes = 1;
	    $cycles = "7";
	} elsif ($name =~ /^R/) {
	    # RTS/RTI
	    $mode = ""; # impl
	    $bytes = 1;
	    $cycles = "6";
	} else {
	    $mode = ""; # impl
	    $bytes = 1;
	    $cycles = "2";
	}
    } elsif ($name =~ /^JMPA$/) {
	$mode = "A";
	$bytes = 3;
	$cycles = 3;
    } elsif ($name =~ /^JMPI$/) {
	$mode = "I";
	$bytes = 3;
	$cycles = 5;
    } elsif ($name =~ /^JSRA$/) {
	$mode = "A";
	$bytes = 3;
	$cycles = 6;
    } elsif ($name =~ /#$/) {
	$mode = "#";
	$bytes = 2;
	$cycles = 2;
    } elsif ($name =~ /^(AS|LS|RO|DE|IN).Z/) {
	$mode = "Z";
	$bytes = 2;
	$cycles = 5; # r+w
    } elsif ($name =~ /^...Z/) {
	$mode = "Z";
	$bytes = 2;
	$cycles = 3;
    } elsif ($name =~ /A([XY])$/) {
	$mode = "$1";
	$bytes = 3;
	$cycles = 4;
    } elsif ($name =~ /(IX|STAIX)$/) {
	$mode = "I";
	$bytes = 2; # zero page?
	$cycles = 6;
    } elsif ($name =~ /IY$/) {
	$mode = "I";
	$bytes = 2; # zero page?
	$cycles = 5;
    } elsif ($name =~ /^...A$/) {
	$mode = "A";
	$bytes = 3; # zero page?
	$cycles = 4;
    }

    $cycles++ if $name =~ /Z[XY]$/;

    my $rop = substr($op,1,1).substr($op,0,1);
    return ($name, $op, $rop, $mode, $bytes, $cycles);
}


