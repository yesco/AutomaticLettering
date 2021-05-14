(--- .fun files

I tried to find various 6502 assemblers,
but many are PC oriented, or don't exist
in source code form for linux.

So... write your own, included in the
JS-6502 simulator.

It's a simple macro assembler, that
basically just produces a stream of bytes.

It's really stupid; it doesn't select
op-codes depending on the arguments but
instead you need to be specific:

Normal 6502	Simplified form
-----------	---------------
INX		INX
LDA #$12	LDA# 12
STA $4711,X	STAAX 4711
STA ($4711),X	STAIX 4711
STA ($4711),Y   STAIX 4711

Note that 4 character values, or addresses,
are changed to the little-endian.
These are the same:

STA $4711,X	STAAX 4711
STA $4711,X	STAAX 11 47

"macros" are substituted by name,
recursively:

= INX2 INX INX ;

= fourbytes 11 22 33 44 ;
= eightbytes fourbytes fourbytes ;
= sixteenbytes eightbytes eightbytes ;

The same defined as a "function":

: INX2
  INX
  INX
;

NOTE: I call it "functions" as RTS is
added at the end, unless it ends with
"FALLTHROUGH":

So they are basically labels, but when
referred to automatically generates
JSR label, that's why I call them
functions.

Notice, how, below, it doesn't matter
if INX2 is a "function" or a macro;
that is the benefit of this way.

: INX4
  INX2
  FALLTHROUGH ;
: INX2
  INX
  INX
;

NOTE: parenthesis are comments and
cannot be nested, LOL.

=== address value manipulations ===
Other functions:
_4711	=>	11
^711	=>	47
*4711	=>	relative addressing
                -> 1 byte
&label	=>	4 byte address from label,
		and it doesn't do JSR.

label+12 =>	add decimal 12 to 4 byte label value
label-7	=>	subtract dec12 from label

Cannot be used as 4711+12, even if it
read FOOADDR+12. TODO maybe?
)

(--- SAN - the Simple Assembly Notation

https://docs.google.com/document/d/16Sv3Y-3rHPXyxT1J3zLBVq4reSPYtY2G6OSojNTm4SQ/edit?usp=drivesdk
)

(--- opcodes with named addressed modes)
(xxx#	- immediate #const)
(xxxZ	- ZeroPage)
(xxxZX	- ZeroPage + X)
(xxxA	- Address)
(xxxX	- address + X)
(xxxY	- address + Y)
(xxxIX	- *[IndexedAddress + X])
(xxxIY	- *[Indexed Address] + Y)

(--- basic 6502 instructions)
= PHP 08 ;
= PHA 48 ;
= PLA 68 ;
= PLP 28 ;

= LDA# a9 ;
= LDAZ a5 ;
= LDAZX b5 ;
= LDAA ad ;
= LDAX bd ;
= LDAY b9 ;
= LDAIX a1 ;
= LDAIY b1 ;

= STAZ 85 ;
= STAZX 95 ;
= STAA 8d ;
= STAX 9d ;
= STAAX 9d ;
= STAY 99 ;
= STAIX 81 ;
= STAIY 91 ;

= LDX# a2 ;
= LDXZ a6 ;
= LDXZY b6 ;
= LDXA ae ;
= LDXAY be ;

= STXZ 86 ;
= STXZY 96 ;
= STXA 8e ;

= LDY# a0 ;
= LDYZ a4 ;
= LDYZX b4 ;
= LDYA ac ;
= LDYAX bc ;

= STYZ 84 ;
= STYZX 94 ;
= STYA 8c ;

= CMP# c9 ;
= CMPZ c5 ;
= CMPZX d5 ;
= CMPA cd ;
= CMPAX dd ;
= CMPAY d9 ;
= CMPIX c1 ;
= CMPIY d1 ;

= CPX# e0 ;
= CPXZ e4 ;
= CPXA ec ;

= CPY# c0 ;
= CPYZ c4 ;
= CPYA cc ;

= BITZ 24 ;
= BITA 2c ;

= ADC# 69 ;
= ADCZ 65 ;
= ADCZX 75 ;
= ADCA 6d ;
= ADCAX 7d ;
= ADCAY 79 ;
= ADCIX 61 ;
= ADCIY 71 ;

= SBC# e9 ;
= SBCZ e5 ;
= SBCZX f5 ;
= SBCA ed ;
= SBCAX fd ;
= SBCAY f9 ;
= SBCIX e1 ;
= SBCIY f1 ;

= ASL 0a ;
= ASLZ 06 ;
= ASLZX 16 ;
= ASLA 0e ;
= ASLAX 1e ;

= LSR 4a ;
= LSRZ 46 ;
= LSRZX 56 ;
= LSRA 4e ;
= LSRAX 5e ;

= ROL 2a ;
= ROLZ 26 ;
= ROLZX 36 ;
= ROLA 2e ;
= ROLAX 3e ;

= ROR 6a ;
= RORZ 66 ;
= RORZX 76 ;
= RORA 6e ;
= RORAX 7e ;

= LSR 4a ;
= LSRZ 46 ;
= LSRZX 56 ;
= LSRA 4e ;
= LSRAX 5e ;

= TAX aa ;
= TAY a8 ;
= TSX ba ;
= TXA 8a ;
= TXS 9a ;
= TYA 98 ;

= NOP ea ;

= JMPA 4c ;
= JMPI 6c ;

= JSRA 20 ;
= RTS 60 ;

= BCC 90 ; (Branch Carry Clear)
= BCS b0 ; (Branch Carry Set)

= BMI 30 ; (Branch if MInus)
= BPL 10 ; (Branch Positive L?)

= BNE d0 ; (Branch Not Equal)
= BEQ f0 ; (Branch EQual)

= BVC 50 ; (Branch if oVerflow Clear)
= BVS 70 ; (Branch if oVerflow Set)

= BRK 00 ; (Force interrupt)
= RTI 40 ;

= CLC 18 ;
= SEC 38 ;
= CLD d8 ;
= SED f8 ;
= CLI 58 ;
= SEI 78 ;
= CLV b8 ;

= DECZ c6 ;
= DECZX d6 ;
= DECA ce ;
= DECAX de ;

= DEX ca ;

= DEY 88 ;

= INCZ e6 ;
= INCZX f6 ;
= INCA ee ;
= INCAX fe ;

= INX e8 ;

= INY c8 ;

= AND# 29 ;
= ANDZ 25 ;
= ANDZX 35 ;
= ANDA 2d ;
= ANDAX 3d ;
= ANDAY 39 ;
= ANDIX 21 ;
= ANDIY 31 ;

= EOR# 49 ;
= EORZ 45 ;
= EORZX 55 ;
= EORA 4d ;
= EORAX 5d ;
= EORAY 59 ;
= EORIX 41 ;
= EORIY 51 ;

(fake instruction, fallthrough,
 it's replaced with nothing and no RTS)

= FALLTHROUGH 00 00 00 ;

(------------------------------- system)

: stop (loop forever)
  LDA# 00
  BEQ *stop
;

= SCREEN bb80 ;

(screen cursor pointer)
= ZCURSORLO 00 ;
= ZCURSORHI 01 ;
= ZCURSOR 00 ; (only use indirect)

(used for copying strings)
= ZSTRLO 02 ;
= ZSTRHI 03 ;
= ZSTR 02 ; (only use indirect)

: home
  (reset screen ptr)
  LDA# _SCREEN
  STAZ ZCURSORLO
  LDA# ^SCREEN
  STAZ ZCURSORHI
;

: putc
  (write char)
  LDY# 00
  STAIY ZCURSOR
  FALLTHROUGH
;
: right
  (advance screen pointer)
  INCZ ZCURSORLO
  BNE 02
  INCZ ZCURSORHI
  (todo: check/fix OOB)
;

: left
  (back screen pointer)
  LDAZ ZCURSORLO
  BNE 02
  DECZ ZCURSORHI

  DECZ ZCURSORLO
  (todo: check/fix OOB)
;

: up
  SEC
  LDAZ ZCURSORLO
  SBC# 28
  STAZ ZCURSORLO
  LDAZ ZCURSORHI
  SBC# 0
  STAZ ZCURSORHI
  (todo: check/fix OOB)
;

: down
  CLC
  LDA# 28
  ADCZ ZCURSORLO
  STAZ ZCURSORLO
  LDA# 00
  ADCZ ZCURSORHI
  STAZ ZCURSORHI
  (todo: check/fix OOB)
;

: movx
  BNE 01
  RTS
  right
  DEX
  JMPA &movx
;
: movy
  BNE 01
  RTS
  down
  DEY
  JMPA &movy
;
  
: gotoxy (using x=col, y=row!)
  home
  CPX# 00  movx
  CPY# 00  movy
;
  
(strings: ends with 0, or byte with high bit set)

(strcpy has two functions:
   copy string from fe+1 -> fc
   stop at either \0 or high-bit set char)
(trashes A,X,Y)
: strcpy
  (advance string pointer)
  INCZ ZSTRLO
  BNE 02
  INCZ ZSTRHI

  LDY# 00

  (read char)
  LDAIY ZSTR
  BNE 01
  (return if \0 )
  RTS 

  (print char)
  TAX
  AND# 7f
  STAIY ZCURSOR

  (advance screen pointer)
  INCZ ZCURSORLO
  BNE 02
  INCZ ZCURSORHI

  (if high-bit 7 set, end of token)
  TXA
  BPL *strcpy
  RTS
;

: puts
  (string address is at RTS position)
  PLA
  STAZ ZSTRLO
  PLA
  STAZ ZSTRHI

  strcpy

  (isn't all this same as JMPI ZSTR+1 ?)
  LDAZ ZSTRHI
  PHA
  LDAZ ZSTRLO
  PHA
  RTS (jumps back after string\0!)
;

: putspc
  LDA# 20
  putc
;
  
: puthn (put A hex nibble on screen)
  AND# 0f
  CLC
  ADC# 30
  CMP# 3a
  BMI 02
  ADC# 06 (carry is set)
  putc
;

: puthb (put byte A as hex on screen)
  PHA

  ROR
  ROR
  ROR
  ROR
  puthn

  PLA
  puthn
;

: puth
  LDAZ ZSTRHI
  puthb  

  LDAZ ZSTRLO
  puthb
;

: putd10kd ($2710)
  LDAZ ZSTRLO
  SEC
  SBC# 10
  TAY
  LDAZ ZSTRHI
  SBC# 27
  BCS 01
  RTS
  
  STAZ ZSTRHI
  TYA
  STAZ ZSTRLO

  INX
  JMPA &putd10kd
;

: putd10k
  LDX# '0'
  putd10kd
  TXA
  putc
;

: putd1kd ($03e8)
  LDAZ ZSTRLO
  SEC
  SBC# e8
  TAY
  LDAZ ZSTRHI
  SBC# 03
  BCS 01
  RTS
  
  STAZ ZSTRHI
  TYA
  STAZ ZSTRLO

  INX
  JMPA &putd1kd
;

: putd1k
  LDX# '0'
  putd1kd
  TXA
  putc
;

: putd100d (64)
  LDAZ ZSTRLO
  SEC
  SBC# 64
  TAY
  LDAZ ZSTRHI
  SBC# 00
  BCS 01
  RTS
  
  STAZ ZSTRHI
  TYA
  STAZ ZSTRLO

  INX
  JMPA &putd100d
;

: putd100
  LDX# '0'
  putd100d
  TXA
  putc
;

: putd10d (0a) (can be simplified but...)
  LDAZ ZSTRLO
  SEC
  SBC# 0a
  TAY
  LDAZ ZSTRHI
  SBC# 00
  BCS 01
  RTS
  
  STAZ ZSTRHI
  TYA
  STAZ ZSTRLO

  INX
  JMPA &putd10d (== jsr+rts)
;

: putd10
  LDX# '0'
  putd10d
  TXA
  putc
;

: debputd

  LDA# 'x' putc
  puth
  putspc
  putd10k
  putspc
  
  LDA# 'x' putc
  puth
  putspc
  putd1k
  putspc
  
  LDA# 'x' putc
  puth
  putspc
  putd100
  putspc
  
  LDA# 'x' putc
  puth
  putspc
  putd10
  putspc
  
  LDA# 'x' putc
  puth
  putspc
  LDAZ ZSTR puthn
  putspc
;

: putd

  putspc
  (todo: refector to call same!)
  putd10k
  putd1k
  putd100
  putd10
  LDAZ ZSTR puthn
;

(alt: many data stacks
 - zero page
 STAZX LDAZX INX DEX = data stack below
 STXZY LDXZY INY DEY
 STYZX LDYZX INX DEX
 - using fixed position = static vars
 STAX LDAX INX DEX
 STAY LDAY INY DEY
 - using a changable "stack base" pointer
 STAIY LDAIY INY DEY

 - using an array of base stack pointers?
 STAIX LDAIX
)

(data stack on page 0,
 starting at $ff, growing downwards,
 at $ff, store current stack pointer X,
 each next entry 2 bytes)
(X used to index,
 ZX stack is next byte to use
 ???ZX 0 points to TOP lo byte
 ???ZX 1 points to TOP hi byte)

= stack ff ; (address of stack pointer X)

(invoke to restore data stack X)
= dostack LDXZ stack ; 

(store date stack X)
= endstack STXZ stack ;

= DEX2 DEX DEX ;
= INX2 INX INX ;

(xstack functions prefixed by
 x to indicate that x needs to be preserved)

: xdrop (better to inline: 2 b intsof 3)
  INX2
;
  
( YA = 2 byte integer, Y=hi, A=lo )
: xpushYA (6 bytes)
  DEX2
  STAZX 1 (hi)
  STYZX 0 (lo)
;

: xpullYA
  LDAZX 1
  LDYZX 0
  INX2
;

: xpush0
  DEX2
  LDA# 00
  STAZX 1
  STAZX 0
;

: xpush1
  DEX2
  LDA# 00
  STAZX 1
  LDA# 01
  STAZX 0
;

: xinc
  INCZX 0
  BNE 02
  INCZX 1
;

: xdec
  DECZX 0
  BNE 02 (possibly wrong)
  DECZX 1
;

: xincwA
  CLC
  ADCZX 0
  STAZX 0
  BNE 02
  ADCZX 1
  STAZX 1
;

: xdecwA
  (RSB - reverse subtrac!)
  EOR# ff
  SEC
  SBCZX 0
  STAZX 0

  BNE 02
  SBCZX 1
  STAZX 1
;

: xplus
  CLC
  LDAZX 2
  ADCZX 0
  STAZX 2

  LDAZX 3
  ADCZX 1
  STAZX 2

  INX2
;

: xminus
  SEC
  LDAZX 2
  SBCZX 0
  STAZX 2

  DEX
  LDAZX 3
  ADCZX 1
  STAZX 3

  INX2
;

: xpull
  LDAZX 0
  STAZ ZSTRLO

  LDAZX 1
  STAZ ZSTRHI

  INX2
;

; xpush (2 bytes after)
  (value address is at RTS position)
  PLA
  CLC
  ADC# 01
  STAZ ZSTRLO
  TAY

  PLA
  ADC# 00
  STAZ ZSTRHI

  xpushYA

  (generate return address)
  INY (lo)
  BNE 01
  INC (hi)

  PHA (hi)

  TYA (lo)
  PHA 
  RTS (jumps back 2 bytes call)
;

: xprint
  xpull
  endstack
  putd
  dostack
;

: xhprint
  xpull
  endstack
  puth
  dostack
;

: xsprint
  xpull
  endstack
  strcpy
  dostack
;

(------------------------------- system end)

: pandoric
  LDX# 00 (beginnin of screen)

  LDA# 'P' putc
  LDA# 'A' putc
  LDA# 'N' putc
  LDA# 'D' putc
  LDA# 'O' putc
  LDA# 'R putc
  LDA# 'I putc
  LDA# 'C putc
;

: spandoric
  puts "pandoric"
  
  LDA# '!' putc
  LDA# '!' putc
  LDA# '!' putc
;

: drawt
  LDX# ff
  FALLTHROUGH
;
  
: drawt0
  LDA# 'A' putc
  DEX
  BNE *drawt0
;

: printA
  PHA TAY LDA# 00 xpushYA xprint PLA
;

( efficient 32-bit DEC32
  - https://news.ycombinator.com/item?id=17275797)

( - https://llx.com/Neil/a2/mult.html )

( 16x16 => 32 bit multiplication
LDA #0       ;Initialize RESULT to 0
STA RESULT+2
LDX #16      ;There are 16 bits in NUM2
L1:
LSR NUM2+1   ;Get low bit of NUM2
ROR NUM2
BCC L2       ;0 or 1?
TAY          ;If 1, add NUM1 (hi byte of RESULT is in A)
CLC
LDA NUM1
ADC RESULT+2
STA RESULT+2
TYA
ADC NUM1+1
L2      
ROR A        ;"Stairstep" shift
ROR RESULT+2
ROR RESULT+1
ROR RESULT
DEX
BNE L1
STA RESULT+3
)

( 16/16 divsion => 16,16
LDA #0      ;Initialize REM to 0
STA REM
STA REM+1
LDX #16     ;There are 16 bits in NUM1
L1 :     
ASL NUM1    ;Shift hi bit of NUM1 into REM
ROL NUM1+1  ;(vacating the lo bit, which will be used for the quotient)
ROL REM
ROL REM+1
LDA REM
SEC         ;Trial subtraction
SBC NUM2
TAY
LDA REM+1
SBC NUM2+1
BCC L2      ;Did subtraction succeed?
STA REM+1   ;If yes, save it
STY REM
INC NUM1    ;and record a 1 in the quotient
L2:
DEX
BNE L1
)

( leif stenson clever 8x8=>16 bits mult
  19 bytes only! avg 130 cycles
  - https://www.lysator.liu.se/~nisse/misc/6502-mul.html
  same as:
  - https://llx.com/Neil/a2/mult.html )
= ZmulsLO 85 ;
= ZmulsHI 86 ;

: mulYA
  STAZ ZmulsLO
  STYZ ZmulsHI

  LDA# 00 (hi result byte)
  LDX# 08
  LSRZ ZmulsLO
  FALLTHROUGH ;
: mulYAloop
  BCC 03
  CLC
  ADCZ ZmulsHI
  (no add)
  ROR
  RORZ ZmulsLO
  DEX
  BNE *mulYAloop

  TAY
  LDAZ ZmulsLO
;

: sqrA
  TAY
  JMPA &mulYA
;

= ZmulaLO 85 ;
= ZmulaHI 86 ;
= ZmulLO 87 ;
= ZmulHI 88 ;
= ZmulY 89 ;

(russian peasant multiplication)
: mulYAr (Y*A -> YA)
  STAZ ZmulaLO
  LDA# 00
  STAZ ZmulaHI
  STAZ ZmulLO
  STAZ ZmulHI
  STYZ ZmulY

  FALLTHROUGH ;
: mulYArl
  (half)
  LSRZ ZmulY
  BCS 07 (bit 1 was set)
  BNE 0d (0 => return)
  LDAZ ZmulLO
  LDYZ ZmulHI
  RTS

  (add)
  CLC
  LDAZ ZmulLO
  ADCZ ZmulaLO
  STAZ ZmulLO
  LDAZ ZmulHI
  ADCZ ZmulaHI
  STAZ ZmulHI

  (double)
  ASLZ ZmulaLO
  ROLZ ZmulaHI

  JMPA &mulYArl
;

: sqrAr
  TAY
  JMPA &mulYAr
;

(handgenerated code for 1 to 15 sqr lt 180)
= Zto 80 ;
= tocontJMP 0082 ; (jmp instruction)
= Ztocont 83 ; (continuation)
= ZtocontLO 83 ;
= ZtocontHI 84 ;
(panda002: simulated 1 upto 255)
: panda002 (init)

  (init jmpa location)
  LDA# 4c
  STAA tocontJMP

  LDA# 08
  STAZ ZtocontHI
  LDA# 9b
  STAZ ZtocontLO

  (init loop)
  LDA# 1
  STAZ Zto
  FALLTHROUGH ;
: panda002a (test)
  LDAZ Zto
  CMP# 0f (15)

  ( == or < )
  BEQ 09
  BCC 07

  ( fail/end - implicit rts) ;
: panda002to
  INCZ Zto
  JMPA &panda002a ;

(next with relative jump!)
: panda002sqr
  sqrA
  FALLTHROUGH ;

(next)
: panda002lt ( lt 30 )
  CMP# b4 ( 180 )
  BCC 03
  (fail)
  JMPA &panda002to

  FALLTHROUGH ;

(next)
: panda002emit (call continuation)
  ( printA JMPA &panda002to )

  (-fake a return address below JMPI)
  TAY

  LDA# _panda002emit
  CLC

  ADC# 11
  TAX

  LDA# ^panda002emit
  ADC# 00
  PHA
  TXA PHA

  TYA
  
  (-call print/emit = with ADC# 11
    here can be only 3 bytes!)

  (JSRA &printA)        ( works! )
  (printA)              ( same )
  (JSRA 089b)		( same )

  (RTS BRK BRK)         ( test bytes )
  JMPA tocontJMP      ( NOT )

  (-it'll do RTS back to here!)
  JMPA &panda002to
;


: panda001
  LDX# 00
  LDY# 05
  gotoxy
  puts "_______"
  
  LDA# 00
  LDY# 2a
  xpushYA
  xprint
;

: main
  pandoric
  spandoric

  dostack
  LDA# 44
  LDY# 88

  xpushYA
  xpushYA

  LDA# 'x' putc
  xhprint
  (print)

  LDA# 00
  LDY# 00
  xpushYA
  xpushYA
  LDA# 'x' putc
  xhprint
  (xprint)
  
  LDA# 23
  LDY# 45
  xpushYA
  xpushYA
  LDA# 'x' putc
  xhprint
  (xprint)

  LDA# ff
  LDY# ff
  xpushYA
  xpushYA
  LDA# 'x' putc
  xhprint
  (xprint)

  puts "ONE"

  puts "TWO"

  puts "foobar"

  (home)
  LDX# 28
  drawt0
  puts "FISH"
  drawt
  puts "HSIF"

  puts "foobar"

  puts "THREE"

  left left
  puts "AB"

  down puts "^^"
  up puts "vv"

  LDX# 02
  LDY# 1b
  gotoxy
  puts "----------lower2col------"

  panda001

  (continuation to be called)
  LDA# ^printA
  STAZ ZtocontLO
  LDA# _printA
  STAZ ZtocontHI

  panda002
;

(todo: since don't have forward ref, this must be last!)
: reset

  (init stack)
  LDX# ff
  TXS
  (data stack)
  DEX
  endstack

  SEI (interrupt off)

  home

  main

  stop
;
