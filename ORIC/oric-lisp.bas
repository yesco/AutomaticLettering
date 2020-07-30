
100 '- INIT
100 GOSUB 30000 ' INIT SUBS
O
200 '- READ-EVAL
200 INPUT "? ";L$



1000 '--- READER => T

1100 '- SKIP SPACES

1150 LET C$=MID$(L$, P, 1)
1151 LET C=ORD(C$)
1152 LET S=P

1160 '- FIND END OF TOKEN
1170 REPEAT
1175   LET P=P+1
1180   LET X$=MID$(L$, P, 1)
1185 UNTIL X$="" OR X$=" " OR X$=")"
1190 LET T$=MID$(L$, S, P-S)

1200 '- LIST?
1210 IF C$<>")" THEN 1500

1500 '- NUMBER?
1510 IF (C$<"0" OR C>"9") AND NOT (C$="." OR C$="." OR C$="-" OR C$="#") THEN 1600

1600 '- STRING?
1610 IF C$=<>42 THEN 1700

2000 '--- MKATOM T$ => T

2010 '- SEE IF WE HAVE IT ALREADY
2020'  THIS IS SLOW, BUT ONLY DONE DURING READ
2030 FOR I=1 TO AC
2040   IF A$[I]=T$ THEN T=I:RETURN
2050 NEXT I

2100 '- NOPE CREATE IT

2110 'TODO: DIM A NEW NAME, WHEN ACCESS NEED TO POKE THE NAME!

3010 LET SC=SC+1
3020 LET S0$[SC]=T$
3030 LET T=SC
3040 RETURN

3000 '--- CONS A D => T
3010 LET V=A

30000 '--- INIT
30900 LET READ=900       ' => T
31000 LET PARSE=1000     ' L => T
32000 LET MKATOM=2000    ' ... => T
33000 LET CONS=3000      ' A D => T
33010   LET SHIFT=#FFFF+1' =64K
33315   LET FULL=
33020   LET ACONS=10
33021   LET ASTRING=20
33021   LET AFLOAT=40
33020   LET DCONS=80
33021   LET DSTRING=160
33021   LET DFLOAT=320
33030   LET CG=4000
33030   LET SG=4000

 0: NIL
 1: NULL?
 2: ATOM?
 3: SYMBOL?
 4: NUMBER?
 5: INT?
 6: STRING?
 7: CONS?
 8: EVAL
 9: APPLY
10: LAMBDA
11: NLAMBDA
12: CONS
13: CAR
14: CDR
15: SETCAR
16: SETCDR
17: SET
18: SETQ
19: QUOTE
20: COND
21: MAP
22: ASSOC
23: MEMBER
24: PRINC
25: PRIN1
26: PROG
27: esc next is ctrl-char!
28: CONCAT
29: APPEND
30: EQUAL
31: ??

126: special encoding follows
127: special encoding foloows

128 
... ORIC BASIC KEYWORDS!
237

238 ? 
239 ?
240 ?
241 ?
242 ?
253 ?
254 ?
255 ? NIL ? (if 0 == end!) or 255 is end?

REDUCE?
NTH
NTHCDR
FUNC?
SPLIT
CMP?

Can resuse:
! + @ - * / ^ > = < & ABS ASC ATN CHAR CHR$ GET HEX$ ...

DIM: => make-array
LET:
PRINT:
DEF:
FN:
LIST:
IF:
REPEAT:
UNTIL:
FOR:
AND:
AUTO: ?
CALL:
CLEAR:
CONT:
DATA:
EDIT:
ELSE: ?
END: !
FALSE: ?
TRUE: ?
FRE: ?
GOSUB: ?
GOTO: ?
GRAB: ?
HIMEM: ?
INPUT: ?
LLIST: ?
LPRINT: ?
NEW: ?
NEXT: ?
ON: ?
(PATTER: ?)
POP: ?
PULL: ?
READ: !
RECALL: ?
RELEASE: ?
RESTORE: ?
RETURN: !
RUN: ?
SPC: ?
STEP: ?
STOP: ?
STORE: ?
TAB: ?
THEN: ?
TO: ?
TROFF: UNTRACE
TRON: TRACE
UNTIL: !
USR: ?
VAL: EVAL !


When floating-point numbers are stored in memory (e.g., for variables and array elements),

They occupy 5 bytes of memory. This is made up as follows:

Byte 1: the exponent of the number.

Bytes 2 to 5: the mantissa of the number (most significant bit to least significant bit).

The number is translated into binary, and then the decimal point altered so that it is to the left of the most significant digit (which in binary is always going to be 1).

The exponent represents the number of decimal places that the decimal point has been moved, so if the mantissa is M and the exponent is E, then the value of the number is 0.M. * 2” E.

There are three considerations:

1. When the exponent is positive (meaning that the number is 1 or greater), the exponent will be #80 upwards. When the exponent is negative (meaning that the number is 0 – 0.99999) the exponent is subtracted from #80.

For example, an exponent of – 4 is #7C; an exponent of +4 is #84.

2. Since the leftmost bit of the mantissa is always going to be 1, this bit is assumed and replaced with a bit that represents the sign of the number (0 is positive, 1 negative).

3. When the number is zero the exponent is set to #00. This can be quite difficult to follow, so here are a few examples of how numbers are stored.

Do not worry if you do not understand floating point fully – it does not prevent you from using the subroutines!

EXAMPLES OF FLOATING POINT

1. +4 is Exponent: #83 Mantissa #00 #00 #00 #00. The most significant bit has been replaced by the positive sign. The exponent is #83 because the number 100.0 is stored as 0.1.

2. –6 is Exponent: #83 Mantissa #CO #00 #00 #00. In this case, the lost bit at the front of the number has been replaced with ‘1’ because the mantissa is negative.


7C xx xx xx xx : 0.xxxb-4 '0--0.9999...
84 xx xx xx xx : 1.xxxb+4 '>=1
80 0x xx xx xx : 1.xxxb+4 'positive number
80 1x xx xx xx : 1.xxxb+4 'negative

00 -- -- -- -- : 0 !
83 00 00 00 00 : 1.xxxb+3 '+4   0 000
83 C0 00 00 00 : 1.xxxb+3 '-6 C=1 100
83 D0 00 00 00 : 1.xxxb+3 '-7 C=1 110

##########  ORISCHEME  ###########
00 00 00 gg gg : next index free list?
00 qq qq -- -- : ?? unused qqqq!=0
DA dd dd aa aa : cdr car, type D, type A

type is encoded as:
0000 nil
0001 integer
0010 symbol
0011 cons
0100 string
0101 (float index)
0110 -
0111 -
0111 -
1000 gc mark bit (in A: cons, B: string!)

qqqq xxxx can be used for more encodings:
- 00 00 00    gg gg - gc free next index

symbols
- 00 b1100,0000 00 00 kk - oric keywords
- 00 b1100,0000 00 aa aa - jsr addr?
- 00 b10bb,bbbb hh hh hh - symbols 30 bits
    30 bits with 32 char options;
      (a-z 12!*-?0)
   - or 4 7ascii  (32-96) + 0--12 (3.5 bits)
- 00 b01bb,bbbb hh hh hh - extened types ?
  - hash
  - array
  - native code pointer

INTERNAL FLOATING-POINT NUMBERS

All calculations involve two operands, and since intermediate numbers need to be stored somewhere. there exist two floating-point accumulators. These are similar in format to the floating-point numbers stored in memory, except that the sign of the mantissa does not overwrite the highest bit in the mantissa. To save time, the sign is stored as a sixth byte, with its top bit cleared for positive numbers and set for negative numbers.

A mantissa of zero is still represented by a zero exponent.

The two accumulators are known as ACC1 and ACC2 in the remainder of this chapter. Unless stated to the contrary, ACC1 is used to receive the result of any calculation, with the exception of some of the transfer commands. As discussed in Chapters 3 and 4, ACC1 is used by the extension commands ! and & when passing numeric data, as well as in the formula evaluation subroutine.

LOCATION OF NUMBERS

ACC1 is stored between #DO and #D5, as described above. ACC2 follows ACC1 at #D8 to #DD.

When a floating-point number is turned into a string of ASCII characters, this string is always stored between #100 and #10F. The reverse procedure, however, uses the pointer #E9, #EA to indicate the start address. Remember also that version 1.0 ROMs have a bug that puts the attribute 02 (instead of #20) at the front of the number.

When the routines refer to a number in memory, two of the 6502 registers are used to point to the start of this area.
