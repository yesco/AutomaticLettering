(BUGS:
        (I think simulator is crap)
        LDA# ' ' putc  (crashes)
        LDA# 'A' putc  (gives 'a')
        LDA# 67   

)

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
STA ($4711),X	STAXI 4711
STA ($4711),Y   STAXI 4711

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

If a label ends with a '_', then it's
"local" to the file and will not be
stored in the runtime dictionary.
This will make debugging more difficult,
so if you have space don't use this feature
until your code works. When addresses are
printer, labels and JSR/JMP and other addresses
are identified in printed by name! (TODO:)

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
(xxxXI	- *[Address + X])
(xxxIY	- *[Address] + Y)

(--- basic 6502 instructions)
= PHP 08 ;
= PHA 48 ;
= PLA 68 ;
= PLP 28 ;

= LDA# a9 ;
= LDAZ a5 ;
= LDAZX b5 ;
= LDAA ad ;
= LDAAX bd ;
= LDAAY b9 ;
= LDAXI a1 ;
= LDAIY b1 ;

= STAZ 85 ;
= STAZX 95 ;
= STAA 8d ;
= STAAX 9d ;
= STAAY 99 ;
= STAXI 81 ;
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
= CMPXI c1 ;
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
= ADCXI 61 ;
= ADCIY 71 ;

= SBC# e9 ;
= SBCZ e5 ;
= SBCZX f5 ;
= SBCA ed ;
= SBCAX fd ;
= SBCAY f9 ;
= SBCXI e1 ;
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
= ANDXI 21 ;
= ANDIY 31 ;

= ORA# 09 ;
= ORAZ 05 ;
= ORAZX 15 ;
= ORAA 0d ;
= ORAAX 1d ;
= ORAAY 19 ;
= ORAXI 01 ;
= ORAIY 11 ;

= EOR# 49 ;
= EORZ 45 ;
= EORZX 55 ;
= EORA 4d ;
= EORAX 5d ;
= EORAY 59 ;
= EORXI 41 ;
= EORIY 51 ;

(fake instruction, fallthrough,
 it's replaced with nothing and no RTS)

= FALLTHROUGH 00 00 00 ;

(--- 6502 compact dis/assember ---)
(Any minimal dis/assembers out there?
 Nust be native running on 6502!
 
 Facts:
 - 149 opcodes
 - 56 mnemonics (3b each) (63??? asm-modes.pl)
 + 13 addressing modes (?)

 A simple encoding of needed information:

 - 56*3 => 118 (sorted string of mnemonics)
   (suggested: pack each in a word => 112)

 - 149*3 => 447 (sorted array of opcodes
   1b, index in names 1b, addrmode 1b)

   (suggested: pack 2 modes in byte
    => 128 bytes + 256 index)

   (jsk: offset have 2 bits not need use:
    lobit=0 and hibit=0, TODO?)

   (jsk: 5 columns no OPs in optable!
    16 byte array of lo nibble array.
    get address.lo to 16 byte column.
    If address.lo = ff => none, do it in
    code. (+ (* 11 16) 16) = 192 add c2)

   (jsk: mode=4 bits use same
    address.lo/2 as modes are packed:
    (/ (* 11 16) 2) = 88 add c2

    ...or...

    in packed "ASLFOO", we have
      1bit/w free => 56 bits.
    in offset map we have 2bit/offs
      (* 11 16 2) = 352 bits

    (- (+ 352 56) (* 88 8)) = -296
    (/ -296 8) = -37 bytes (missing)
    )

    (+ 192 88)

 615 bytes already!
 (suggested: (+ 112 128 256) = 496 add c1)
 (jsk: (+ 112 192 88) = 392 add c1, c2)

 then add code...

 we need the following functionality;
   opcode -> 3char mnemonic
   opcode -> valid (or not)
   opcode -> addrmode
   (mnemonic, addrmode) -> opcode

 Nataurally, we could code it with
 help of the tables listed above.
 
 But I belive, using the inherit
 mismatched structure of the bitpattern
 of the opcodes one could write clever
 code to achieve the same thing.

 Has anyone seen such code?

 This is of course intended to run on 6502.
 No crosscompiles apply.

 I have seen references to the existance
 of a 1KB dis/asm monitor, not sure if it
 included data. However, the link was
 broken.

 Any experiences?

 In my case I use a SAN (Simplified
 Assembly Notation), but that shouldn't
 really matter:

= LDA# a9 ;
= LDAZ a5 ;
= LDAZX b5 ;
= LDAA ad ;
= LDAAX bd ;
= LDAAY b9 ;
= LDAXI a1 ;
= LDAIY b1 ;
 
)

(--- SYSTEM ---)

( Y 12 X 15 gotoxy! )
= A LDA# ;
= X LDX# ;
= Y LDY# ;

(- init method chaning -)
( Each init method that needs to be called
  name it init. But before do:

  : oldinit init ; (save previous)
  : init (new init, override)
    oldinit
    ...
    your init code
   ;


  TODO: idea

  ALT 1:
  - when :CHAIN: label redefining existing label
    if it exists, insert JSRA &idea, to call it.
  - caveat: this will use lots of stack so no more
    than 128 routines.
  ALT 2:
  -  It could change RTS at end to JMPA &idea,
     however, other RTSs in the routine may screw
     it up.
  - and shouldn't they be done in source order?


  :CHAIN: init
    (automatically inserts call to previous init!)
  ;

)

(- ZP/Zeropage regs for params)

= zregisters 00 ;
= zregisterMAX 09 ;
= zregisterLEN 0a ;
= z0 00 ; = wA 00 ; = wA_LO 00 ;  = Rto      00 ;
= z1 01 ;           = wA_HI 01 ;  = Rto_HI   01 ;
= z2 02 ; = wB 02 ; = wB_LO 02 ;  = Rlen     02 ;
= z3 03 ;           = wB_HI 03 ;  = Rlen_HI  03 ;
= z4 04 ; = wC 04 ; = wC_LO 04 ;  = Rfrom    04 ;
= z5 05 ;           = wC_HI 05 ;  = Rfrom_HI 05 ;
= z6 06 ; = wD 06 ; = wD_LO 06 ;  = Rdata    06 ;
= z7 07 ;           = wD_HI 07 ;  = Rdata_HI 07 ;
= z8 08 ; = wE 08 ; = wE_LO 08 ;  = Rlink    08 ;
= z9 09 ;           = wE_HI 08 ;  = Rlink    09 ;

( use for jmp, can't use for JSR/no rts...)

= zjmpInstr 14 ;
= zjmp 15 ; ( address for JMPA zjmp )
= zjmpLO 15 ;
= zjmpHI 16 ;

( - 16 zp results )
= Zresult 16 ;

= zr0 18 ;
= zr1 19 ;
= zr2 1a ;
= zr3 1b ;
= zr4 1c ;
= zr5 1d ;
= zr6 1e ;
= zr7 1f ;
= zr8 20 ;
= zr9 21 ;
= zra 22 ;
= zrb 23 ;
= zrc 24 ;
= zrd 25 ;
= zre 26 ;
= zrf 27 ;
= registersMAX 27 ;

( - memory management)
= HERE 28 ;  = HERE_LO 28 ;  = HERE_HI 29 ;
= HEAP 2a ;  = HEAP_LO 2a ;  = HEAP_HI 2b ;
= FREE 2c ;  = FREE_LO 2c ;  = FREE_HI 2d ;

( - 33-34 free ununsed)
= xxyy 33 ; 
= xxyy_LO 33 ;
= xxyy_HI 34 ;

( - 85..ff FREE on zero page!
    =123 bytes
 
    Update: usage by stack:
      $bf-$ff (- #xbf #x85) = 58 bytes 
)
 
 ( - 9th_ play area -)
 (0 - )
 (1 85-86)
   = 9TH_REGISTERS 84 ; ( offset -1 as B is 1)
   = 9TH_REGISTERS_hi 85 ; ( offset -1 as B is 1)
   = 9TH_B 85 ;  = 9TH_B_lo 85 ;  = 9TH_B_hi 86 ;
   = 9TH_C 87 ;  = 9TH_B_lo 87 ;  = 9TH_B_hi 88 ;
   = 9TH_D 89 ;  = 9TH_B_lo 89 ;  = 9TH_B_hi 8a ;
   = 9TH_E 8b ;  = 9TH_B_lo 8b ;  = 9TH_B_hi 8c ;
   = 9TH_F 8d ;  = 9TH_B_lo 8d ;  = 9TH_B_hi 8e ;
   = 9TH_G 8f ;  = 9TH_B_lo 8f ;  = 9TH_B_hi 90 ;

 (7 91-92 "H" LOL - used for finding tok addr)
   = 9TH_TOK 91;= 9TH_TOK_lo 91;= 9TH_TOK_hi 92;

 (8 93-94)
   (FREE)

 (9 95-96)
   = 9TH_ARG 95;= 9TH_ARG_lo 95;= 9TH_ARG_hi 96;

 (10 97-98)
   = 9TH_SR 97 ;
   = 9TH_IO 98 ;

 (11 99-9a)
   = 9TH_OUT 99;= 9TH_OUL_lo 99;= 9TH_OUT_hi 9a;

 (12 9b-9c stack base)
   = 9TH_DS 9b; = 9TH_DS_lo 9b; = 9TH_DS_hi 9c;

 (13 9d-9e use hardware stack)
   = 9TH_S 9d ; (not releated just using)
   = 9TH_Y 9e ; (interpreter offset, store)

 (14 9f-a0 PC)
   = 9TH_PC 9f; = 9TH_PC_lo 9f; = 9TH_PC_hi a0;

 ( <<< FREE: a1 >>> )


 ( <<< ENDFREE: be >>> )

 ( - data stack -)
   = STACKLOW bf ; (- 254 (* 32 2))

 ( addr ff stores data stackpointer)

( ----------- zero page end -------------)
 

( --- ?FREE $200-$2ff
    - BUT: used by BASIC graphics routinmes
)



( --- ?FREE $400-$4ff
   - BUT: "reserved for use with disk system"
)


( ? FREE $500-$97ff FREE 37632 bytes contigious!
  - TODO: use as heap growing downwards.
)
 
   ( for now use it for heap storage
     growing downwards )

   = HEAP_TOP 97ff ;

( ?FREE $9800-$b3ff
  - ??? FREE in TEXTMODE
  - BUT: used by HIRES
)

( ?FREE $bfeo-$bfff
 - ??? FREE 32 bytes!
 (really?)
)

(?FREE #9800-#98FF - in HIRES (32 chardef 256b)
       #9C00-#9CFF - in HIRES (32 alt chardef 256b)
)

  = HIRES a000 ;
  = HIRES_END bfdf ;
  = HIRES_LEN 1fe0 ;

  = SCREENPTR 026d ; (TODO: use)
  = SCREEN bb80 ; (content)
  ( = SCREEN_END xxxx ; )
  = SCREEN_LEN 0460 ;
     
(?FREE #b400-#b4ff - TEXTMODE: first 32 chardefs
  The first 256 bytes of each character set are
  unused, so programs can be put at #B400-#B4FF

  Although the Reset button on the Oric causes
  the character set to be regenerated these
  areas are not affected.
)
(?FREE #B800-#B8FF - TEXTMODE: 32 alt charsdfs 256 b)

(?FREE #B800-#BB7F - TEXTMODE:
  Since the alternate character set is rarely
  used the entire area between #B800 and #BB7F.
)

( ---------- system functions -----------)

(: mysub ff ; (00 gives illegal op ff ok, NOP ok?))
(: mysub TXA ;)

: stop (loop forever)
  LDA# 00
  BEQ *stop
;

(- good to haves)

( convenient - but slow)
= SAVE
  PHP PHA TXA PHA TYA PHA
;
= RESTORE
  PLA TAY PLA TAY PLA PHP
;

= SAVEx    TXA PHA ;
= RESTOREx PLA TAX ;

(--- PARAMETER CALLING ---)
( This is the implementation support functions
  for calling functions like this:

    LDA# 00 paFill SCREEN SCREEN_LEN

  This function is flexible in the value
  to fill, but fixes the addresses.
  Name it pFunctionName to make calling
  convention clear. It only takes constant
  parameters. The number of bytes is fixed
  and determined by function.

)

(TODO: implement a pPrintf!
 
  pPrintf "A num %5d and %7s string."
    CounterAddr HelloWorldAddr
    
  Prefix/modifiers
  %... - default: two byte address of value
  %$.. - use last pointer (no numeric arg)
  %z.. - one byte zpage address
  %@.. - indirection using page zero address
  %l.. - long (2x bytes from normal)
  %U.. - unsigned (for floats)

  %% - '%'
  %c - char
  %b - byte (jsk)
  %[-][\d+]s  (mod: ,=printables/. , '=\n\N^c)
  %[\d+]d/i/u/x/X/o/O
  %[+-][0][\d+[.\d+]]f/g/e/g/e
  %n - pointer to store chars written so far
  %42h - hexdump 42 characters


  %[aa[xx[yy]]]& - load register a-y and call ptr
  
)

(

: pFill (usage: LDA# 'x' pFill wADDRESS wBYTES)
  (get address from stack store in jmp/return)
  PLA
  STAZ zjmpLO
  PLA
  STAZ zjmpHI

  LDY# 01 (rts address points to before next)

  LDY# 05 (copy 4 bytes = 2 registers + 1)
  FALLTHROUGH
 ;

: pFillregs (copy backwards using one less reg)
(
  LDAIY zjmp
  DEY (decrement before to use +1 offset!)
  STAIY zregisters (not effecting Z flag!)
  BNE pFillregs

(alt1: increase return pointer)(14 bytes, 24cyc)
  (finally we're ready to call)
  JSRA fill

  LDAZ zjmpLO
  CLC
  ADC# 05 (skip 4 bytes = 2 words + 1 byte!)
  STAZ zjmpLO
  BCC 02
  INCZ zjmpHI

  JMPI zjmp (our fake rts, +3cyc)

(TODO: move to before JSR fill)
(TODO: make JSRA fill tailrecurse push  on stack)
       
(alt2: alternative)(18 bytes, 26cyc!)
  (to be called after JSR zjmp)		 
  LDAZ zjmpLO
  CLC
  ADC# 04 (skip 4 bytes = 2 words)
  TAX

  LDAZ zjmpHI
  ADC# 00
  PHA (hi)

  TXA
  PHA (lo)

  JMPA &fill
  (since this is can be done before,
   we can fallthrough! saving 3b + 3cyc)
)
;

)

: fill (at wA(mod) set mem to A for wB bytes)
  LDY# 00

  LDXZ wA_LO (do wA_LO times)

NOP (won't work without the extra NOP!? wtf?)
  INCZ wB_HI (one more for X count)

  FALLTHROUGH ;

: fill_ (write wB bytes to wA)
  STAIY wA

(if removed need either two NOP!)
(ADC# 01)
(NOP NOP)

  INY
  BNE 02
  INCZ wA_HI (copied 256 bytes, need inc hi)
  
  DEX
  BNE *fill_

  (init to copy one more page)
  (x is zero == 256)

  DECZ wB_HI (hi count)
  BNE *fill_
;

( --- screen stuff ---)

(TODO: store scren address somewhere in Z)

= CURROW 0268 ;
= CURCOL 0269 ; (or address 30)
                (40 == address 31)
= ZCURCOL 30 ;
= ZCURWID 31 ;

= PAPER 028b ;
= INK 026c ;

(- screen cursor pointer)
(ORIC:
  $12,$13 Address of text cursor. 
  $259 Screen cursor position (V1.1). 
  $265 Current cursor state indicator, 0 - off, 1 — on.
)
= ZCURSORLO 12 ;
= ZCURSORHI 13 ;
= ZCURSOR 12 ; (only use indirect)

(used for copying strings)
= ZSTRLO 00 ;
= ZSTRHI 01 ;
= ZSTR 00 ; (only use indirect)

: home
  (reset screen ptr)
  LDA# _SCREEN
  STAZ ZCURSORLO
  LDA# ^SCREEN
  STAZ ZCURSORHI

  (update cursor pos)
  LDA# 00
  STAA CURROW
  STAA CURCOL
  STAZ ZCURCOL
;

: scroll
  (TODO: implement!)
  (for now, just wrap around?)

  home
;

: putc (register A retained, Y trashed)
  (write char)
  LDY# 00
  STAIY ZCURSOR
  FALLTHROUGH ;

: right
  (advance screen pointer)
  INCZ ZCURSORLO
  BNE 02
  INCZ ZCURSORHI

  (update cursor pos)
  INCA CURCOL

  LDYZ ZCURCOL
  INY
  STYZ ZCURCOL

  CPY# 28 (TODO: use ZCURWID, init)
  BNE 0a
  INCA CURROW
  LDA# 00
  STAA CURCOL
  STAZ ZCURCOL

  CMP# 1c
  BNE 03
  scroll
  
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

  (update cursor pos)
  STYA CURROW
  STXA CURCOL
  STXZ ZCURCOL

  (move cursor step by step)
  (TODO: make more efficent)
  CPX# 00  movx
  CPY# 00  movy
;
  
(
: cls
RTS
  home

  (todo use generic fill routine?)

  LDY# 1c (28 rows)
  FALLTHROUGH ;
: clsy_
  LDX# 28 (40 cols)
  FALLTRHOUGH ;
: clsx_

  TXA PHA
  TYA PHA
    LDA# 32  putc
  PLA TAY
  PLA TAX

  DEX
  BNE *clsxloop_
  DEY
  BNE *clsyloop_

  home
;
)

(- strings -)

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

( these are kind of not efficient use:
  - https://codebase64.org/doku.php?id=base:32_bit_hexadecimal_to_decimal_conversion )
  (js emulator doesn't have DECimal mode)

: putd10kd_ ($2710)
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
  JMPA &putd10kd_
;

: putd10k_
  LDX# '0'
  putd10kd_
  TXA
  putc
;

: putd1kd_ ($03e8)
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
  JMPA &putd1kd_
;

(TODO: what is this? used?)
: put1k_ (Y hi, A lo)
  LDX# 00
  STXZ 00
  SEC
  SBC# e8
  TAX
  TYA
  SBC# 03

  BCS 03
  LDXZ 00
  RTS

  TAY
  TXA
  INCZ 00
;

: putd1k_
  LDX# '0'
  putd1kd_
  TXA
  putc
;

: putd100d_ (64)
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
  JMPA &putd100d_
;

: putd100_
  LDX# '0'
  putd100d_
  TXA
  putc
;

: putd10d_ (0a) (can be simplified but...)
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
  JMPA &putd10d_ (== jsr+rts)
;

: putd10_
  LDX# '0'
  putd10d_
  TXA
  putc
;

: debputd

  LDA# 'x' putc
  puth
  putspc
  putd10k_
  putspc
  
  LDA# 'x' putc
  puth
  putspc
  putd1k_
  putspc
  
  LDA# 'x' putc
  puth
  putspc
  putd100_
  putspc
  
  LDA# 'x' putc
  puth
  putspc
  putd10_
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
  putd10k_
  putd1k_
  putd100_
  putd10_
  LDAZ ZSTR puthn
;

( - https://codebase64.org/doku.php?id=base:tiny_.a_to_ascii_routine )

: putdA (put Decimal from A => ascii Y,X,A)
  LDY# 2f
  LDX# 3a
  SEC
  FALLTHROUGH ;

: putdAl100_
  INY
  SBC# 64 (100 dec)
  bcs *putdAl100_
  FALLTHROUGH ;

: putdAl10_
  DEX
  ADC# 0a
  BMI *putdAl10_

  ADC# 2f

  PHA
  TYA putc
  TXA putc
  PLA putc
;


( - https://codebase64.org/doku.php?id=base:32_bit_hexadecimal_to_decimal_conversion )
( The conversion is done by repeatedly
  dividing the 32 bit value by 10 and
  storing the remainder of each division
  as decimal digits. )

(WARNING: untested, just "converted")

: 32div10 ( A = z0..z3 % 10)
  LDY# 32
  LDA# 00
  CLC
  FALLTHROUGH ;

: div10_
  ROL
  CMP# 0a
  BCC 02
  SBC# 0a
  ROL z0
  ROL z1
  ROL z2
  ROL z3
  DEY
  BPL *div10_
;

: hex2dec (32 bit in z0..z3 => r0..r9)
  LDX# 00
  FALLTHROUGH ;

: hex2decl1_
  32div10
  CMP# 00
  BEQ *hex2decl1_
  BNE 03
  FALLTHROUGH ; 

: hex2decl2_
  32div10
  STAZX Zresult
  INX
  CPY# 0a
  BNE *hex2decl2_
;

: 32print
  hex2dec
  LDX# 09
  FALLTHROUGH ;

: 32printskip_ (skip leading zeros)
  LDAAX Zresult
  BNE 03 (goto 32printnext)
  DEX
  BNE *32printskip_
  FALLTHROUGH ;

: 32printnext_
  LDAAX Zresult
  ORA# 30 ('0'?)
  putc
  DEX
  BPL *32printnext_
;

(- keyboard )
( ORIC:

  $2DF Latest key from keyboard. Bit 7 set if valid.

  C779 LSR $02DF Clear key pressed flag
  C77C LDA $02DF Wait until key is pressed
  C77F BPL $C77C
)

= KEYADDR 02df ;

: waitkey (-> A)
  LSRA KEYADDR (hi bit indicate new char)
  FALLTHROUGH ;

: waitkeyloop_
  LDAA KEYADDR
  BPL *waitkeyloop_
  AND# 7f (clear top bit)
;

($35-$84 Input buffer. 80 bytes)
= ZINPUTBUF 35 ;
= ZINPUTBUFEND 84 ;
= INPUTBUFLEN 4f ;

= CTRLA 01 ;
= CTRLC 03 ; (can't catch yet)
= BSKEY 08 ;
= RETURNKEY 0d ;
= CTRLU 15 ; (clear line, go back)

: readline (at ZINPUTBUF, X chars, zero terminated)

  LDX# 00 (how many chars read?)
  FALLTHROUGH ;

: readlineloop_

  (zero terminate)
  LDA# 00
  STAZX ZINPUTBUF

  waitkey (-> A)

  (- control chars)
  CMP# BSKEY
  BNE 07
  ( TODO: )
  LDA# 00 (40)
  STAZX ZINPUTBUF
  JMPA &readlineloop_

  CMP# RETURNKEY
  BNE 01
  RTS

  (lol really need a nop here!)
  NOP

  CMP# CTRLU (abort)
  BNE 03
  LDX# 00
  RTS

  (TODO: allow cursor to move around)

  CPX# INPUTBUFLEN
  BEQ *readlineloop_ (ignore, TODO: beep)
  
  (TODO: CTRL-A read from screen)

  (- printable char)
  STAZX ZINPUTBUF
  INX
  putc

(Cputc '-')
  
  JMPA &readlineloop_
;

(- Convenience -)

: init_screen
(cls)
  Y 00 X 24  gotoxy
  puts "CAPS"
  puts "Ready" (TODO: too BASICy)
  (- TODO: blinking cursor -)
  home down down

  LDX# 00  LDY# 02  gotoxy
;

(--- DATA STACK ---)

(alt: many data stacks
 - zero page
 STAZX LDAZX INX DEX = data stack below
 STXZY LDXZY INY DEY
 STYZX LDYZX INX DEX
 - using fixed position = static vars
 STAAX LDAAX INX DEX
 STAAY LDAAY INY DEY
 - using a changable "stack base" pointer
 STAIY LDAIY INY DEY

 - using an array of base stack pointers?
 STAXI LDAXI
)

(data stack on page 0,
 starting at $ff, growing downwards,
 at $ff, store current stack pointer X,
 each next entry 2 bytes)
(X used to index,
 ZX stack is next byte to use
 ???ZX 0 points to TOP lo byte
 ???ZX 1 points to TOP hi byte)

( Zeropage usage by ORIC:


      FREE $85-$ff - 122 bytes!
)

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
  BNE 02 (possibly wrong w carry?)
  DECZX 1
;

(TODO: look at variants in
 - http://6502.org/source/io/primm.htm)

(mere insertion BELOW causes run error)
(Prefix 'C' as in 'Command')
(Prefix 'I' as in 'Indexed')
: xxxCputc (call by Pputc 'A')
RTS
(
  PLA
  STAZ ZparamsLO
  PLA
  STAZ ZparamsHI
  
  LDY# 00
  LDAIY params
  putc
  
  (9b 13+4cyc)
  INCZ ZparamsLO
  BNE 02
  INCZ ZparamsHI
  JMPI params

  (13b 23cyc)
  LDXZ ZparamsLO
  LDYZ ZparamsHI
  INX
  BNE 01
  INY

  TXA
  PHA
  TYA
  PHA
  RTS
)

(for some reason, one more RTS/NOP will BRK!?)
RTS
RTS
RTS
RTS
RTS
RTS
RTS
77
(8 bytes ok 9 not?)
(NOP)
;
(mere insertion ABOVE causes run error)

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

: xpush (2 bytes after)
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
  CLC
  ADC# 01
  PHA (hi)

  TYA (lo)
  ADC# 00
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

(--- END LIBRARY ---)

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

(-----------------------------)
(--- panda style functions ---)

(- temporary zero page storage )
= Za 80 ; (use in fun that no call other)
= Zb 81 ;
= Zc 82 ;

= Zaa 83 ;
= ZaaLO 83 ;
= ZaaHI 84 ;

= Zbb 85 ;
= ZbbLO 85 ;
= ZbbHI 86 ;

= Zcc 85 ;
= ZccLO 85 ;
= ZccHI 86 ;



( efficient 32-bit DEC32
  - https://news.ycombinator.com/item?id=17275797)





(add without add)

: addx0  INX  BNE 01 INY ;
: addx1  addx0  addx0 ;
: addx2  addx1  addx1 ;
: addx3  addx2  addx2 ;
: addx4  addx3  addx3 ;
: addx5  addx4  addx4 ;
: addx6  addx5  addx5 ;
: addx7  addx6  addx6 ;

: addpeano (YX + A -> YX)
  LSR  BCC 03  addx0
  LSR  BCC 03  addx1
  LSR  BCC 03  addx2
  LSR  BCC 03  addx3
  LSR  BCC 03  addx4
  LSR  BCC 03  addx5
  LSR  BCC 03  addx6
  LSR  BCC 03  addx7
;

: swapAY
  TAX
  TYA
  PHA
  TXA
  TAY
  PLA
;

: printYA
  swapAY (wtf?)
  dostack
  xpushYA xprint
  endstack
;

: addtest
  home
  puts "---ADDTEST---"
  
  LDY# 04
  LDX# 01
  LDA# 05

  addpeano
  TXA

  printYA

  puts "______________"
  
  puts "-addtest---"
;

(not complete yet)
: mulYApeano (Y + A -> YA)
  PHA
  TAX
  TYA
  PHA

  LDY# 00
  addpeano (0X + A -> YX)
;

: mulYpush
  PHA

  TSX
  TXA
  FALLTHROUGH ;

: fillstack
  PHA
  TSX
  BNE *fillstack
  (reached the bottom of stack?)
  PLA
  TYA
  PHA
  (now the $0100 contains original Y)
  FALLTHROUGH;

: remove_ (all S from stack)
  PLA (it contains original S)
  EOR# ff (255-A) (BUG? ff was missing!)
  TAY (number of entries to remove)
  FALLTHROUGH ;
: removeloop_
  PLA
  TSX
  BNE *removeloop_

  PLA (get the original A)

  (TODO: multiply $0100(Y) by A)
;  


(WTF?)
: mul7 (handgen)
  FALLTHROUGH;

: mul72
  JSRA &mul72+3
  FALLTHROUGH;
: mul71
  JSRA &mul71+3
  FALLTHROUGH;
: mul71+3
  ADC# 07
  BCC 01
  INY
;

: mulp (A*Y -> AY)
  TSX
  PHA

  (general idea is to push a program
   on the stack (in revesre order))
  LDA# RTS     PHA
  LDA# TXS     PHA (restore stack)
  TXA  	       PHA
  LDA# LDX#    PHA (stored S)

  (push call on stack)
  LDA# ^addx0  PHA
  LDA# _addx0  PHA
  LDA# JSRA    PHA

  (here Y is untouched)
  LDXA 0100 (get)

  (fill the stack with NOP)  
  LDA# NOP (harmless op)

  FALLTHROUGH;

: fillstack
  PHA
  TSX
  BNE *fillstack

  PLA (drop)
  
  LDA# 00 (lo Zesult)
  LDY# 00 (hi Zesult)
  JSRA 0100 (or jmp)
;


( jsk 6502 mulAY challange
  - https://m.facebook.com/groups/6502CPU/?multi_permalinks=2933057/450297175 )

: mulstackYA

  TSX
  PHA
  TYA
  PHA
  TYA
  PLA
  PLA

  LDA# 00 (hi result byte)
  LDY# 08
  LSRAX 0100
  FALLTHROUGH ;
: mulstackloop
  BCC 04 (no add)
  CLC
  ADCAX 00ff
  (no add)
  ROR
  RORAX 0100
  DEY
  BNE *mulstackloop

  TAY
  LDAAX 0100
;

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
: panda002a_ (test)
  LDAZ Zto
  CMP# 0f (15)

  ( == or < )
  BEQ 09
  BCC 07

  ( fail/end - implicit rts) ;
: panda002to_
  INCZ Zto
  JMPA &panda002a_ ;

(next with relative jump!)
: panda002sqr_
  sqrA
  FALLTHROUGH ;

(next)
: panda002lt_ ( lt 30 )
  CMP# b4 ( 180 )
  BCC 03
  (fail)
  JMPA &panda002to_

  FALLTHROUGH ;

(next)
: panda002emit_ (call continuation)
  ( printA JMPA &panda002to_ )

  (-fake a return address below JMPI)
  TAY

  LDA# _panda002emit_
  CLC

  ADC# 11
  TAX

  LDA# ^panda002emit_
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
  JMPA &panda002to_
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

( from asm-modes.pl:
#   xxx m11 00 = --- BIT JMP JMP* STY LDY CPY CPX
#   xxx m11 01 = ORA AND EOR ADC  STA LDA CMP SBC
#   xxx m11 10 = ASL ROL LSR ROR  STX LDX DEC INC
#           11 = (not used)
)

(for now stupid encoding as 4 chars w space)
  (TODO: pack 3 chars into 15 bits...)
  (TODO: LDA# count printPacked Addr)
  (TODO: a non-zero string type + pascal string?)
  (TODO: page boundary alignment!)
  (TODO: ...by @ffff: directive?)

(TODO: some corruption happens here????)
: regular_NMEMs
"BIT.JMP.JMP.STY.LDY.CPY.CPX.ORA.AND.EOR.ADC.STA.LDA.CMP.SBC.ASL.ROL.LSR.ROR.STX.LDX.DEC.INC." (ends w 0)
;

: printnso (print Y characters from offset X)
  STYZ zr0 (store count)

  FALLTHROUGH ;

: printnsloop
  LDAAX &regular_NMEMs     (don't forget & lol)
  putc

  INX
  DECZ zr0
  BNE *printnsloop
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

  endstack

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

(  panda002)

  addtest

  puts "Stack--"
  LDY# 11
  LDA# 2a
  printYA
  LDY# 63
  LDA# 4d
  mulstackYA
  printYA
  puts "--kcatS"
;

: pFill 
  PLA
  CLC
  ADC# 04

  BCC 06
  TAX
  PLA
  ADC# 01
  PHA
  TXA

  PHA



  RTS
;

: cls
( TODO:
  LDA# 00  pFill SCREEN SCREEN_LEN
  RTS
)

  (fill screen)

  LDA# _SCREEN
  STAZ z0
  LDA# ^SCREEN
  STAZ z1

  LDA# _SCREEN_LEN
  STAZ z2
  LDA# ^SCREEN_LEN
  STAZ z3

  LDA# 20  fill
;

(--------------------------------------------)
( --- Heap
  A heap is defined in high memory (top)
  and grows downwards. To enable compaction
  and relocation, and since pointers is a hassle
  to pass around anyway, we'll use a handle.

  Sketch:
  - pointer at HEAP

  - zero page pointer to heap free list
  - at each free location pointed to, there
    is another pointer to the next free
  - 0000 means at end and no more memory
  - the byte following tells size of free element
  - max 128 heap objects
  - if free lowest: reclaim the memory upping LOW

  Consider:
  - since most pointers will need to use zero page
    anyway, just consider it's the users problem
    to not loose the handle, or move the pointer?
    (dangerous if a rearrangment happens when
     having copied the pointer)
  - store location of pointer to make it movable
  - have one free list
  - have one allocated list
  - allocated data is prefixed by:
    BE EF (or A1 10, or FE EE for free)
  - 2 byte owner address
  - 1 byte size (len) // PASCAL-string!
  - len bytes of data
)

(- Heap handle in A, X is wRegister, trash Y)
(  copies the address of the Hip heap handle to
   named register:

     A 21 X wA aHipLD
)

(
: LDaHip
  ASL
  (TODO: test carry == illegal)
  TAY
  (copy pointer to word register in zp)
  LDAAY HEAP_HANDLES
  STAZX 00
  LDAAY HEAP_HANDLES+1
  STAZX 01
  TYA
;
)


(
: init_heap (reset the heap)
RTS
  LDA# _HEAP_TOP   STAZ HEAP_LO
  LDA# ^HEAP_TOP   STAZ HEAP_HI

  (make sure free list empty)
  LDA# 00
  STAA HEAP_FREE_LIST
  STAA HEAP_FREE_LIST+1

  LDA# _SCREEN     STAZ wA
(TODO: BUG, CRASH: 00+1 => 0000 ??? fix 6502.js)
  LDA# ^SCREEN     STAZ wA+1

  LDA# _SCREEN_LEN  STAZ wB
  LDA# ^SCREEN_LEN  STAZ wB+1

  LDA# 00  fill
(stop)
  
  RTS
;
)

(
: malloc
;

: free
;
)


(--------------------------------------------)
(
: aGrabMem (A bytes alloc, store in X zp word)
  CLC
  ADCZ HERE_LO   STAZ HERE_LO   STAZX 00
  ADCZ HERE_HI   STAZ HERE_HI	STAZX 01
  (TODO: check if run out of memory
         use: HEAP_LOW)

;
)

(- Linked list (dictionary)
   A linked list has the following layout:
   - Rlink (wD) contains current node
   - to traverse load Rlink with start address
   - 0000 means end of list
   - directly after the link
     - 2 bytes next link
     - data
)  

(--------------------------------------------)
(https://forums.nesdev.com/viewtopic.php?f=2&t=11336)

: div80 (common screen width)
  LSR
  FALLTHROUGH ;
: div40 (common screen width)
  LSR
  LSR
  FALLTHROUGH ;
: div10 (bin/dec conversion)
  LSR
  FALLTHROUGH ;
: div5 (18 bytes, 30 cycles)
  STAZ Za
  LSR
  ADC# 0d
  ADCZ Za
  ROR
  LSR
  LSR
  ADCZ Za
  ROR
  ADCZ Za
  ROR
  LSR
  LSR
;

(useful for computers (like ORIC) with 6
 pixels/cell)

: div6 (17 bytes, 30 cycles)
  LSR
  FALLTHROUGH ;
: div3 
  STAZ Za
  LSR
  LSR
  ADCZ Za
  ROR
  LSR
  ADCZ Za
  ROR
  LSR
  ADCZ Za
  ROR
  LSR
;

(--------------------------------------------)
(some planning for the NINTH virtual machine)

: 9th_byte
  puts "Byte..."
;

: 9th_word 
  puts "Word..."
;

: 9th_special
  puts "Special..."
;

: 9th_foo
  puts "Hello_9th!>>>"

  LDA# 01
  TAX
  LDA# 'a'

  (set some data)
  LDY# 12
  LDA# 67
  STYZX 9TH_REGISTERS_hi
  STAZX 9TH_REGISTERS
  printYA

  LDY# 12
  LDA# 67
  STYZX 9TH_REGISTERS_hi
  STAZX 9TH_REGISTERS
  printYA

  LDA# 01
  LDX# 'P' (garbage)

  (calculate value)
  AND# 0f

  BNE 03
  JMPA &9th_byte

  CMP# 07
  BNE 03
  JMPA &9th_word

  BCC 03
  JMPA &9th_special
  
  (ok, we now have an ordinary register)
  PHA

  (make it printable)
  CLC
  ADC# 41

  PHA
    puts "Register"
  PLA putc 

  PHA
    LDA# '-' putc
  PLA

  PLA TAX PHA

  LDAZX 9TH_REGISTERS
  LDYZX 9TH_REGISTERS_hi
  printYA
  
  PLA
  CLC
  ADC# 9TH_REGISTERS
  TAX

  (now X contains actual address in ZP)
  (store in place for indirection)
  LDY# 00
  STXZ 9TH_ARG
  STYZ 9TH_ARG_hi

  (print to make sure)
  LDAZX 00
  LDYZX 01
  printYA
  
  puts "<<<9th_Finished!"
;

(--------------------------------------------)
: FOO_i 
  puts "Indulge"
  RTS (why need)
;

: FOO_f
  puts "Fornicated"
  RTS (why need?)
;

: FOO_r
  puts "Recupriacte"
  RTS (why need?)
;

: FOO_dispatch (a -)
  CMP# 'i'
  BNE 03
(  JMPA &FOO_i)
  JMPA &FOO_i

  CMP# 'f'
  BNE 03
  JMPA &FOO_f
  
  CMP# 'r'
  BNE 03
  JMPA &FOO_r

  CMP# '9'
  BNE 03
  JMPA &9th_foo
  
  PHA
(  puts "%% No such command: ")
  PLA putc
(  LDA# ' ' putc)
  RTS
;

: keydispatch
  A '>' putc
  waitkey
  
  FOO_dispatch
  A 20 putc  (A ' ' putc - crashes!!!!???)

  
  JMPA &keydispatch
;


: readeval

  (prompt)
  LDY# 10   LDX# 00   gotoxy
  LDA# '>'  putc

  readline

  SAVEx

    puts "<<<<<<<<<DONE!!!!!"

    LDY# 09   LDX# 00   gotoxy
    puts "NAME>>>"

    (TODO:typed ALS and didn't get error!)

  RESTOREx

  ASL ASL (mul 4) TAX Y 03   printnso

  JMPA &readeval
;

: reset

  (CPU stuff)
    (interrupt off)
    SEI 

    (init stack)
    LDX# ff
    TXS

  init_screen (doesn't seem to write?)

  (panda system stuff)
    (data stack)
    DEX
    endstack

    (init_heap) (will crash...)

  (main)

  (panda001)
  (panda002) (crashes)

  keydispatch

  readeval
  
  cls
  
  stop
;


( OK, don't ever call this one! )
: HERE_INIT
  (See HERE / GrabMem for usage)
  
  (Two bytes used to verify that it's the
   correct routine: DEADBEEF)
  DE AD BE EF

  (The address of HERE_ADDRESS will be
   stored at the following zero page address,
   and address+1 (hi) by the assembler)
  HERE
;

(-----------------  END ----------------)


   ( DO NOT PUT ANYTHING AFTER HERE )


       ( IT WILL BE OVERWRITTEN! )


            ( NOW GO AWAY! )


                 ( YES )


		    ()