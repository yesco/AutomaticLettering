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
= LDYZ 44 ;
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

(------------------------------- system)

= SCREEN bb80 ;
= ZCURSORLO fc ;
= ZCURSORHI fd ;
= ZCURSOR fc ; (fc,fd, only use indirect)

= ZSTRLO fe ;
= ZSTRHI ff ;
= ZSTR fe ; (fe.ff, only use indirect)

: stop
  LDA# 00
  BEQ *stop
;

: putc
  (write char)
  LDY# 00
  STAIY ZCURSOR

  (advance screen pointer)
  INCZ ZCURSORLO
  BNE 02
  INCZ ZCURSORHI

  RTS
;

: cls
  (TODO: actually clear screen!)
  (SCREEN zero SCLEN)

  (reset screen ptr)
  LDA# _SCREEN
  STAZ ZCURSORLO
  LDA# ^SCREEN
  STAZ ZCURSORHI
;

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
  JMPA &putd10d
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

(stack on page 0,
 starting at $ff, growing downwards,
 at $ff, store current stack pointer X,
 each next entry 2 bytes)
(X used to index,
 ZX stack is next byte to use
 ???ZX 0 points to TOP lo byte
 ???ZX 1 points to TOP hi byte)

= stack ff ; (address of stack pointer X)

(invoke to restore date stack X)
= dostack LDXZ stack ; 

(store date stack X)
= endstack STXZ stack ;

= DEX2 DEX DEX ;
= INX2 INX INX ;

(xstack functions prefixed by
 x to indicate that x needs to be preserved)

: xdrop
  INX2
;
  
: xpushAY
  DEX2
  STAZX 1 (hi)
  STYZX 0 (lo)
;

: xpullAY
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
  BNE 02
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

  DEX2
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

  DEX2
;

: xpull
  LDAZX 0
  STAZX ZSTRLO

  LDAZX 1
  STAZX ZSTRHI

  DEX2
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

  xpushAY

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

: main
  pandoric
  spandoric

  dostack
  LDA# 44
  LDY# 88

  xpushAY
  xpushAY

  LDA# 'x' putc
  xhprint
  (print)

  LDA# 00
  LDY# 00
  xpushAY
  xpushAY
  LDA# 'x' putc
  xhprint
  (xprint)
  
  LDA# 23
  LDY# 45
  xpushAY
  xpushAY
  LDA# 'x' putc
  xhprint
  (xprint)

  LDA# ff
  LDY# ff
  xpushAY
  xpushAY
  LDA# 'x' putc
  xhprint
  (xprint)
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

  cls

  main

  stop
;
