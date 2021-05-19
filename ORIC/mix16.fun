( Mixed Precision 16-bit Floats
  for use by 8-bit 6502 (ORIC ATMOS)
  
  ... or just use .... 768 bytes of
  https://codebase64.org/doku.php?id=base:6502_6510_maths

  Range: -inf -- +inf, NaN (lol!)
  
  Or why not a float8!
  - https://stackoverflow.com/questions/11935030/representing-a-float-in-a-single-byte
  - https://stackoverflow.com/questions/48363018/pack-a-float-to-1-byte-using-the-reverse-of-provided-unpacking-function

   minifloats 
   - https://en.m.wikipedia.org/wiki/Minifloat
   (pic of signed 8 bit float)
   The wikipedia gives clear examples.

JSK: 8 bit varying precision floats

  0000 0000: 0
  0xxx xxxx: 0-127 (exact!)
  1000 0000: NaN
  1000 0001: -inf

  1eee dddd: 1dddd_2 * 2^(2^6) = 10^19

  1111 1111: +inf





128+

JSK: 16 bit varying floating point

  hi-bit = 0:
    0 -- 2^15-1 full precision int15

  hi-bit = 1:::
  
0xffff = NaN?

ALT1: 8 bit exp, 7 bits (+1) precision
  2^(2^8) * 2^8
  range: 10^79 w 2.5 decimal digits!
  
ALT2: varying exp and precision
  3 bits length = 0 -- 7
    len=0 == -inf
    len=7 == +inf

    6 values left == len of exponent
    (1-6 x 2 = 12 bits)

  12 bits left
    
  len = 0 => -inf

  len = 1 =>  2 bits exp
    F10:
      mantissa: 0 -- 1024-1
      exp: -1 -- 2
      range 0 -- 8192
       
  len = 2 =>  4 bits exp
    F8:
      mantissa: 0 -- 256-1
      exp: -7 -- 8
      range 0 -- 10^7

  len = 3 =>  6 bits exp
    F6:
      mantissa: 0 -- 64-1
      exp: -31 -- 32
      range 0 -- 10^21

  len = 4 =>  8 bits exp
    2^256 * 2^4 = 10^78

  len = 5 => 10 bits exp      
    2^(2^10) * 2^2 = 10^308

  len = 6 => 12 bits exp (no prec)
    2^(2^12) = 10^1233

  len = 7 => +inf

)
  