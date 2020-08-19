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
= LDXZY b6
= LDXA ae ;
= LDXAY be ;

= STXZ 86 ;
= STXZY 96 ;
= STXA 8e ;

= LDY# a0 ;
= LDYZ 44 ;
= LDYZX b4
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
= BCC b0 ; (Branch Carry Set)

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
  (delete this)
  STAX SCREEN
  INX       
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


(------------------------------- system)

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
;

(todo: since don't have forward ref, this must be last!)

: reset

  (init stack)
  LDX# ff
  TXS

  SEI (interrupt off)

  cls

  main

  stop
;
