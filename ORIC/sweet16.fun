( Sweet16 by Woz adopted to ORIC/jsemul

  A 16 bit VCPU (Virtual CPU) interpreted
  on 6502. Originally part of APPLE II.

  LDA# 12
  JSRA sweet16 (save all regs AXYSP)
    <sweet 16 code>
  RTN (restore all regs)
  TAY
  
  It has 16 registers: R0 acc R1 R2 R3 R4 R5 R6 R7 R8 R9 Ra R10 Rb R11
  Rc R12 pointer to subroutine stack Rd R13 compare instruction
  results Re R14 SR (status register) Rf R15 PC

  - http://www.easy68k.com/paulrsm/6502/SW16WOZ.TXT )

= RTN 00 ; (Return to 6502)
(6502 style branches with the second
 byte specifying a +/-127 byte
 displacement relative to the address
 of the following instruction.)
= BR  01 ; (BRanch always)
= BNC 02 ; (Branch if No Carry)
= BC  03 ; (Branch if Carry)
= BP  04 ; (Branch if Plus)
= BM  05 ; (Branch if Minus)
= BZ  06 ; (Branch if Zero)
= BNZ 07 ; (Branch if Not Zero)
= BM1 08 ; (Branch if Minus 1)
= BNM1 09; (Branch if Not Minus 1)
= BK  0a ; (BreaK)

= RS  0b ; (Return from Subroutine)
= BS  0c ; (Branch to Subroutine)

(not assigned)
= NOPd 0d ;
= NOPe 0e ;
= NOPf 0f ;

(- SET Register from 2b constant)
( Rn = wconst )
= SET0 10 ;
= SET1 11 ;
= SET2 12 ;
= SET3 13 ;
= SET4 14 ;
= SET5 15 ;
= SET6 16 ;
= SET7 17 ;
= SET8 18 ;
= SET9 19 ;
= SETa 1a ; = SET10 1a ;
= SETb 1b ; = SET11 1b ;
= SETc 1c ; = SET12 1c ;
= SETd 1d ; = SET13 1d ;
= SETe 1e ; = SET14 1e ;
= SETf 1f ; = SET14 1f ;

(- LoaD acc (R0) from register)
( acc = Rn )
= LD0 20 ;
= LD1 21 ;
= LD2 22 ;
= LD3 23 ;
= LD4 24 ;
= LD5 25 ;
= LD6 26 ;
= LD7 27 ;
= LD8 28 ;
= LD9 29 ;
= LDa 2a ; = LD10 2a ;
= LDb 2b ; = LD11 2b ;
= LDc 2c ; = LD12 2c ;
= LDd 2d ; = LD13 2d ;
= LDe 2e ; = LD14 2e ;
= LDf 2f ; = LD14 2f ;

(- STore acc (R0) in register)
( Rn = acc )
= ST0 30 ;
= ST1 31 ;
= ST2 32 ;
= ST3 33 ;
= ST4 34 ;
= ST5 35 ;
= ST6 36 ;
= ST7 37 ;
= ST8 38 ;
= ST9 39 ;
= STa 3a ; = ST10 3a ;
= STb 3b ; = ST11 3b ;
= STc 3c ; = ST12 3c ;
= STd 3d ; = ST13 3d ;
= STe 3e ; = ST14 3e ;
= STf 3f ; = ST15 3f ;

(- LoaD ind from @ddress in register++)
( acc.lo = bytes[register++], acc.hi = 0 )
= LD@0 40 ;
= LD@1 41 ;
= LD@2 42 ;
= LD@3 43 ;
= LD@4 44 ;
= LD@5 45 ;
= LD@6 46 ;
= LD@7 47 ;
= LD@8 48 ;
= LD@9 49 ;
= LD@a 4a ; = LD@10 4a ;
= LD@b 4b ; = LD@11 4b ;
= LD@c 4c ; = LD@12 4c ;
= LD@d 4d ; = LD@13 4d ;
= LD@e 4e ; = LD@14 4e ;
= LD@f 4f ; = LD@15 4f ;

(- STore ind regiser++ to @ddress)
( bytes[register++] = acc.lo )
= ST@0 50 ;
= ST@1 51 ;
= ST@2 52 ;
= ST@3 53 ;
= ST@4 54 ;
= ST@5 55 ;
= ST@6 56 ;
= ST@7 57 ;
= ST@8 58 ;
= ST@9 59 ;
= ST@a 5a ; = ST@10 5a ;
= ST@b 5b ; = ST@11 5b ;
= ST@c 5c ; = ST@12 5c ;
= ST@d 5d ; = ST@13 5d ;
= ST@e 5e ; = ST@14 5e ;
= ST@f 5f ; = ST@15 5f ;

(- LoaD Double byte ind from @ddress in register++)
( acc = words[Rn++++] )
= LDD@0 60 ;
= LDD@1 61 ;
= LDD@2 62 ;
= LDD@3 63 ;
= LDD@4 64 ;
= LDD@5 65 ;
= LDD@6 66 ;
= LDD@7 67 ;
= LDD@8 68 ;
= LDD@9 69 ;
= LDD@a 6a ; = LDD@10 6a ;
= LDD@b 6b ; = LDD@11 6b ;
= LDD@c 6c ; = LDD@12 6c ;
= LDD@d 6d ; = LDD@13 6d ;
= LDD@e 6e ; = LDD@14 6e ;
= LDD@f 6f ; = LDD@15 6f ;

(- STore Double byte ind register++ to @ddress)
(  words[register++++] = acc )
= STD@0 70 ;
= STD@1 71 ;
= STD@2 72 ;
= STD@3 73 ;
= STD@4 74 ;
= STD@5 75 ;
= STD@6 76 ;
= STD@7 77 ;
= STD@8 78 ;
= STD@9 79 ;
= STD@a 7a ; = STD@10 7a ;
= STD@b 7b ; = STD@11 7b ;
= STD@c 7c ; = STD@12 7c ;
= STD@d 7d ; = STD@13 7d ;
= STD@e 7e ; = STD@14 7e ;
= STD@f 7f ; = STD@15 7f ;

(- POP byte from @address of --register)
(Rn is decremented prior to loading the
 ACC, single byte stacks may be
 implemented with the:
 
   ST @Rn and POP @Rn ops

 (Rn is the stack pointer)
)
( acc.lo = bytes[--Rn], acc.hi = 0 )
= POP@0 80 ;
= POP@1 81 ;
= POP@2 82 ;
= POP@3 83 ;
= POP@4 84 ;
= POP@5 85 ;
= POP@6 86 ;
= POP@7 87 ;
= POP@8 88 ;
= POP@9 89 ;
= POP@a 8a ; = POP@10 8a ;
= POP@b 8b ; = POP@11 8b ;
= POP@c 8c ; = POP@12 8c ;
= POP@d 8d ; = POP@13 8d ;
= POP@e 8e ; = POP@14 8e ;
= POP@f 8f ; = POP@15 8f ;

(STore POP (== decr) indirect at @--register)
(Rn is decremented prior to storing the
 ACC, this can be used to move data
)
( bytes[--Rn] = acc.lo )
= STP@0 90 ;
= STP@1 91 ;
= STP@2 92 ;
= STP@3 93 ;
= STP@4 94 ;
= STP@5 95 ;
= STP@6 96 ;
= STP@7 97 ;
= STP@8 98 ;
= STP@9 99 ;
= STP@a 9a ; = STP@10 9a ;
= STP@b 9b ; = STP@11 9b ;
= STP@c 9c ; = STP@12 9c ;
= STP@d 9d ; = STP@13 9d ;
= STP@e 9e ; = STP@14 9e ;
= STP@f 9f ; = STP@15 9f ;

(ADD register to acc)
( acc += Rn )
= ADD0 a0 ;
= ADD1 a1 ;
= ADD2 a2 ;
= ADD3 a3 ;
= ADD4 a4 ;
= ADD5 a5 ;
= ADD6 a6 ;
= ADD7 a7 ;
= ADD8 a8 ;
= ADD9 a9 ;
= ADDa aa ; = ADD10 aa ;
= ADDb ab ; = ADD11 ab ;
= ADDc ac ; = ADD12 ac ;
= ADDd ad ; = ADD13 ad ;
= ADDe ae ; = ADD14 ae ;
= ADDf af ; = ADD15 af ;

(SUBtract register from acc)
( acc -= Rn )
= SUB0 b0 ;
= SUB1 b1 ;
= SUB2 b2 ;
= SUB3 b3 ;
= SUB4 b4 ;
= SUB5 b5 ;
= SUB6 b6 ;
= SUB7 b7 ;
= SUB8 b8 ;
= SUB9 b9 ;
= SUBa ba ; = SUB10 ba ;
= SUBb bb ; = SUB11 bb ;
= SUBc bc ; = SUB12 bc ;
= SUBd bd ; = SUB13 bd ;
= SUBe be ; = SUB14 be ;
= SUBf bf ; = SUB15 bf ;

(POP Double byte to acc from @----register)
(Because Rn is decremented prior to
 loading each of the ACC halves,
 double-byte stacks may be implemented
 with the

    STD @Rn and POPD @Rn ops

 (Rn is the stack pointer)
)     
( acc = words[----Rn] )
= POPD@0 c0 ;
= POPD@1 c1 ;
= POPD@2 c2 ;
= POPD@3 c3 ;
= POPD@4 c4 ;
= POPD@5 c5 ;
= POPD@6 c6 ;
= POPD@7 c7 ;
= POPD@8 c8 ;
= POPD@9 c9 ;
= POPD@a ca ; = POPD@10 ca ;
= POPD@b cb ; = POPD@11 cb ;
= POPD@c cc ; = POPD@12 cc ;
= POPD@d cd ; = POPD@13 cd ;
= POPD@e ce ; = POPD@14 ce ;
= POPD@f cf ; = POPD@15 cf ;

(ComPaRe acc with register)
( R13 = ACC - Rn, Carry=ACC > R13 )
= CPR0 d0 ;
= CPR1 d1 ;
= CPR2 d2 ;
= CPR3 d3 ;
= CPR4 d4 ;
= CPR5 d5 ;
= CPR6 d6 ;
= CPR7 d7 ;
= CPR8 d8 ;
= CPR9 d9 ;
= CPRa da ; = CPR10 da ;
= CPRb db ; = CPR11 db ;
= CPRc dc ; = CPR12 dc ;
= CPRd dd ; = CPR13 dd ;
= CPRe de ; = CPR14 de ;
= CPRf df ; = CPR15 df ;

( INcRement register )
( ++Rn )
= INR0 e0 ;
= INR1 e1 ;
= INR2 e2 ;
= INR3 e3 ;
= INR4 e4 ;
= INR5 e5 ;
= INR6 e6 ;
= INR7 e7 ;
= INR8 e8 ;
= INR9 e9 ;
= INRa ea ; = INR10 ea ;
= INRb eb ; = INR11 eb ;
= INRc ec ; = INR12 ec ;
= INRd ed ; = INR13 ed ;
= INRe ee ; = INR14 ee ;
= INRf ef ; = INR15 ef ;

(DeCRement register)
( --Rn )
= DCR0 f0 ;
= DCR1 f1 ;
= DCR2 f2 ;
= DCR3 f3 ;
= DCR4 f4 ;
= DCR5 f5 ;
= DCR6 f6 ;
= DCR7 f7 ;
= DCR8 f8 ;
= DCR9 f9 ;
= DCRa fa ; = DCR10 fa ;
= DCRb fb ; = DCR11 fb ;
= DCRc fc ; = DCR12 fc ;
= DCRd fd ; = DCR13 fd ;
= DCRe fe ; = DCR14 fe ;
= DCRf ff ; = DCR15 ff ;
