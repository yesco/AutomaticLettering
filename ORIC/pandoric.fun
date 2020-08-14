: stop a9 00 f0 fd ;
: putchar 9d 80 bb e8 ;
: pandoric
  a9 'P' putchar 
  a9 'A' putchar 
  a9 'N' putchar
  a9 'D' putchar
  a9 'O' putchar
  a9 'R putchar
  a9 'I putchar
  a9 'C putchar
;
: reset a2 ff 9a 78 a2 00 pandoric stop ;

