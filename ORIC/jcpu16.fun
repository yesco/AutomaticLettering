( Sketch of a 16-bit virtual (j)CPU )
(
  CALL
  RETURN
  GOTO
)
( ... or should it be a 16 instruction
      virtual 16-bit stack machine? )
(
  Break

  push
  pop
  drop
  over
  swap
  rot
  -rot
  tuck

  ( not good to use:
    pick
    roll
  )

  clear
  depth


  jump >r
  call r++ >r
  
  
)