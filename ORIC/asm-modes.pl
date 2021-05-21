# embryo for encoding/coding
# dis/asm op codes and parse mnemonics
#
# One way to test it, is to see if
# it maps to the same both ways:
#
#   perl asm-modes.pl | sort -k2 | less
#
# Functions needed:
# - opcode -> 3char mnemonic (21 uniq chars=
# - opcode -> valid (or not)
# - opcode -> addrmode
# - (mnemonic, addrmode) -> opcode
#
# 63 unqiue mnemomics
#
# 21 unique chars in mnemomics
# (* 21 21 21) = 9261
# (/ 65536 9261) = 7
#
# Means can have 1.9 bits. lol!
#
#
#
#
#          6502 INSTRUCTIONS BIT PATTERNS
#                    ON ONE PAGE
#
#                   visualized by
#        2021 Jonas S Karlsson (jsk@yesco.org)
#
#
# ref: The 6502/65C02/65C816
#      Instruction Set Decoded
#      - https://llx.com/Neil/a2/opcodes.html
# opcode:
#   xxx mmm cc = generic structure
#   ----------
#   0xx 000 00 = call&stack       BRK JSR RTI RTS
#   0xx 010 00 = stack            PHP PLP PHA PLA
#
#   xx0 110 00 = magic flags =0   CLC CLI*TYA CLD
#   xx1 110 00 = magic flags =1   SEC SEI --- SED
#
#   1xx 010 00 = v--transfers--> *DEY TAY INY INX
#   1xx x10 10 = TXA TXS TAX TSX  DEX --- NOP ---
#
#   ffv 100 00 = branch instructions:
#   ff0 100 00 = if flag == 0     BPL BVC BCC BNE
#   ff1 100 00 = if flag == 1     BMI BVS BCS BEQ
#   00v 100 00 = Negative flag   (BPL BMI)
#   01v 100 00 = oVerflow flag   (BVC BVS)
#   10v 100 00 = Carry flag      (BCC BCS)
#   11v 100 00 = Zero flag       (BNE BEQ)
#        mm                  (v--- indirect)
#   xxx m11 00 = --- BIT JMP JMP* STY LDY CPY CPX
#   xxx m11 01 = ORA AND EOR ADC  STA LDA CMP SBC
#   xxx m11 10 = ALS ROL LSR ROR  STX LDX DEC INC
#           11 = (not used)
# modes summary:             (RW = shift INC DEC)
#   xxx mmm cc               bytes cycles
#   --- --- --               ----- ------
#       000  0 = #immediate     2  2
#       000  1 = (zero page,X)  2  6
#  (2x) 001    = zero page      2  3 +2/RW
#       010  0 = accumulator    1  2
#       010  1 = #immediate     2  2
#  (2x) 011    = absolute       3  4 +2/RW JMP=3
#       100  0 = ---
#       100  1 = (zero page),Y  2  5 +1/STA +1/page++
#  (2x) 101    = zero page,X    2  4 +2/RW
#       110  0 = ---
#       110  1 = absolute,Y     3 \4 +3/RW +1/STA
#  (2x) 111    = absolute,X     3 / +1/page++ (cross)
#              JMP              3  3 JMP 
#     branch instructions       2  2 +1/true +2/cross
#       stack: PHA/PHP          1  3 +1/PLA/PLP
#              JSR RTS RTI      3  6 +1/BRK
#   other implied instructions  1  2 

#
# ------------ cc = 01
#
# aaa	opcode
# ============
# 000	ORA
# 001	AND
# 010	EOR
# 011	ADC
# 100	STA
# 101	LDA
# 110	CMP
# 111	SBC
#
# mmm	addressing mode
# =====================
# 000	(zero page,X)
# 001	zero page
# 010	#immediate
# 011	absolute
# 100	(zero page),Y
# 101	zero page,X
# 110	absolute,Y
# 111	absolute,X
#
# ------------ cc = 10
#
# aaa	opcode
# ============
# 000	ASL
# 001	ROL
# 010	LSR
# 011	ROR
# 100	STX
# 101	LDX
# 110	DEC
# 111	INC
#
# mmm	addressing mode
# =====================
# 000	#immediate
# 001	zero page
# 010	accumulator
# 011	absolute
# 101	zero page,X
# 111	absolute,X
#
# ------------ cc = 11
#
# no instructions
#
# ------------ cc = 00
#
# aaa	opcode
# ============
# 001	BIT
# 010	JMP
# 011	JMP (abs)
# 100	STY
# 101	LDY
# 110	CPY
# 111	CPX
#
# addressing modes same as cc = 10
#
# ------------ cc = 00 & mmm = 100
# op = xxy10000
#
# xx	flag
# ==========
# 00	negative
# 01	overflow
# 10	carry
# 11	zero
#
# ------------ other instructions
#
# PHP PLP PHA PLA   DEY TAY INY INX
# 08  28  48  68    88  A8  C8  E8
#
o# CLC SEC CLI SEI   TYA CLV CLD SED
# 18  38  58  78    98  B8  D8  F8
#
#         TXA TXS TAX TSX DEX NOP
#         8A  9A  AA  BA  CA  EA
#


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

    my $name2 = guessNameFromOP2($op, $h, $l, $hn, $ln, $odd);

    unless($name2 eq $name) {
	print "%%---------ERR: $op $name $name2 - not the same\n";
	exit;
    }
    
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
    my $branch = 'PLMIVCVSCCCSNEEQ';
    my $brk = 'BRKJSRRTIRTS';
    my $php = 'PHPCLCPLPSECPHACLIPLASEIDEYTYATAYCLVINYCLDINXSED';
    my $ora = 'ORAANDEORADCSTALDACMPSBC';
    my $asl = 'ASLROLLSRROR';
    my $txa = 'TXATXSTAXTSXDEX---NOP---';
    my $stx = 'STXLDXDECINC';
    
    my $half = int($hn/2);
    if ($l eq '0') {
        if ($odd) {
	    # Branch
	    $name = 'B' . substr($branch, $hn-1, 2);
	} elsif ($hn <= 8) {
	    $name = substr($brk, $half*3, 3);
	} else {
	    $name = substr($bitcpx, ($half-6)*3, 3);
	}
    } elsif ($l eq '8') {
	$name = substr($php, $hn*3, 3);
    } elsif ($l =~ /[159d]/) {
	$name = substr($ora, $half*3, 3);
    } elsif ($l =~ /[4c]/) {
	$name = substr($bitcpx, ($half-1)*3, 3);
    } elsif ($l =~ /[6ae]/) {
	if ($hn < 8) {
	    $name = substr($asl, $half*3, 3);
	} else { # hn >= 8
	    if ($l eq 'a') {
		$name = substr($txa, ($hn-8)*3, 3);
	    } elsif ($l =~ /[26e]/) {
		$name = substr($stx, ($half-4)*3, 3);
	    }
	}
    }

    return $name;
}

sub guessNameFromOP2 {
    my ($op, $h, $l, $hn, $ln, $odd) = @_;

    #my ($s, $i) = guessNameFromOP2h(@_);
    my ($s, $i) = guessNameFromOP2asm(@_);
    if ($i eq 'result') {
	return $s;
    } else {
	return substr($s, $i * 3, 3);
    }
}

sub guessNameFromOP2h {
    my ($op, $h, $l, $hn, $ln, $odd) = @_;
    my $name = '-';
    
    my $bit = 'BITJMPSTYLDYCPYCPX';
    my $branch = 'PLMIVCVSCCCSNEEQ';
    my $branch3 = 'BPLBMIBVCBVSBCCBCSBNEBEQ';
    my $brk = 'BRKJSRRTIRTS';
    my $php = 'PHPCLCPLPSECPHACLIPLASEIDEYTYATAYCLVINYCLDINXSED';
    my $ora = 'ORAANDEORADCSTALDACMPSBC';
    my $asl = 'ASLROLLSRROR';
    my $txa = 'TXATXSTAXTSXDEX---NOP---';
    my $stx = 'STXLDXDECINC';
    
    my $half = int($hn/2);
    
    if ($l eq '0') {
        if ($hn & 1) {
	    return $branch3, $half;
	} elsif ($hn & 8) {
	    return $bit, $half-6;
	} else {
	    return $brk, $half;
	}
    } elsif ($l eq '8') {
	return $php, $hn;
    } elsif ($ln & 5 == 5) {
	return $ora, $half;
    } elsif ($l =~ /[4c]/) {
	return $bit, $half-1;
    } elsif ($ln & 2 && $ln & 12) {
#    } else { # why is this not same?
	if ($hn & 8) {
	    if ($l eq 'a') {
		return $txa, $hn-8
	    } else {
		return $stx, $half-4;
	    }
	} else {
	    return $asl, $half;
	}
    } else {
	$y = '-';
	$a = 'result';
    }

    return $y, $a;
}

sub guessNameFromOP2asm {
    my ($op, $h, $l, $hn, $ln, $odd) = @_;
    my $name = '-';
    
    my $bit = 'BITJMPSTYLDYCPYCPX';
    my $branch = 'PLMIVCVSCCCSNEEQ';
    my $branch3 = 'BPLBMIBVCBVSBCCBCSBNEBEQ';
    my $brk = 'BRKJSRRTIRTS';
    my $php = 'PHPCLCPLPSECPHACLIPLASEIDEYTYATAYCLVINYCLDINXSED';
    my $ora = 'ORAANDEORADCSTALDACMPSBC';
    my $asl = 'ASLROLLSRROR';
    my $txa = 'TXATXSTAXTSXDEX---NOP---';
    my $stx = 'STXLDXDECINC';
    
    my $half = int($hn/2);
    
    my $a = $half; # index
    my $x = $hn; # saved
    my $y = ""; # offset
    
    if ($l eq '0') {
        if ($hn & 1) {
	    $y=$branch3;
	} elsif ($hn & 8) {
	    $y=$bit; $a-=6;
	} else {
	    $y=$brk;
	    return $brk, $half;
	}
    } elsif ($l eq '8') {
	$y=$php; $a=$x;
    } elsif ($ln & 5 == 5) {
	$y=$ora;
    } elsif ($l =~ /[4c]/) {
	$y=$bit; $a-=1;
    } elsif ($ln & 2 && $ln & 12) {
#    } else { # why is this not same?
	if ($hn & 8) {
	    if ($l eq 'a') {
		$y=$txa; $a=$x; $a-=8;
	    } else {
		$y=$stx; $a-=4;
	    }
	} else {
	    $y=$asl;
	}
    } else {
	$y = '-';
	$a = 'result';
    }

    return $y, $a;
}

sub guessOPFromName {
    my ($name) = @_;
    my $op = '-';
    
    my $h = '-';
    my $l = '-';

    if ($name =~ /^O../) {
	$h = '[01]'; # ORA
    } elsif ($name =~ /^E../) {
	$h = '[45]'; # EOR
    } elsif ($name =~ /^N../) {
	$h = 'e'; # NOP ea
	$l = 'a';
    } elsif ($name =~ /^T../) {
	$h = '[ab89]';
	$l = '[a8]';
    } elsif ($name =~ /^.I./) {
	$h = '2'; # BIT
	$l = '[4c]';
    } elsif ($name =~ /^B../) {
	$h = '[13579bdf]'; # Branch
	$l = '0';
    } elsif ($name =~ /^D../) {
	$h = '[8cd]'; # DE.
	$l = '[68ae]';
    } elsif ($name =~ /^P../) {
	$h = '[0246]'; # PL/PH
	$l = '8';
    } elsif ($name =~ /^D../) {
	$h = '[8cd]'; # PL/PH
	$l = '[68ae]';
    } elsif ($name =~ /^J../) {
      if ($name =~ /^.M/) {
      	 $h = '[46]'; JMP
	 $l = 'c';
      }	else {
         $h = '2'; # JSR
         $l = '0';
      }
    } elsif ($name =~ /^I../) {
      if ($name =~ /^..C/) {
      	 $h = '[ef]'; INC
	 $l = '[6e]';
      }	else {
         $h = ($name =~ /^..X/) ? 'e' : 'c'; # INX INY
         $l = '8';
      }
    } elsif ($name =~ /^.E./) {
	$h = '[37f]'; # SE.
	$l = '8';
    } elsif ($name =~ /^.M./) {
	$h = '[cd]'; # CMP
	$l = '[159d]';
    } elsif ($name =~ /^.L./) {
	$h = '[15bd]'; # CL.
	$l = '8';
    } elsif ($name =~ /^.B./) {
	$h = '[ef]'; # SBC
	$l = '[159d]';
    } elsif ($name =~ /^S../) {
	$h = '[89]'; # ST.
	$l = '[1456cde]';
    } elsif ($name =~ /^.T./) {
	# RTS/RTI
	$h = ($name =~ /^..I/) ? '4' : '6';
	$l = '0';
    } elsif ($name =~ /^C../) {
	$h = ($name =~ /^..X/) ? 'e' : 'c';
	$l = '[04c]';
    } elsif ($name =~ /^R../) {
	# ROL ROR
	$h = ($name =~ /^..L/) ? '[23]' : '[67]';
	$l = '[6ae]';
    } elsif ($name =~ /^...L/) {
	$h = '[01]'; # 
	$l = '[1456cde]';
    } elsif ($name =~ /^...C/) {
	$h = '[67]'; # ADC
	$l = '[159d]';
    } elsif ($name =~ /^.S./) {
	$h = '[45]'; # LSR
	$l = '[6e]';
    } else {
	$h = '[ab]'; # LD
	if ($name =~ /^..X/) {
	    $l = '[26e]';
	} else {
	    $l = '[04c]';
	}
    }

    return $h.$l;
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
