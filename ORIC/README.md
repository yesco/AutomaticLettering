# ORIC BASIC SIMULATOR!

## Why?

Yeah, I had an ORIC ATMOS, and it may be, physiclly, one of the most beautiful designed computers; real keyboard, black, with white letters, black machine case, with white ORIC logo that has a red line diagonally crossing the O from top-right to bottom-left, then underlining the word.

There are various emulators of note, however, I believe, few with sources comnpletely availabe. For example there is the goOric16 on Android -- but it's no longer working very well, and even if you have an external bluetooth key-board, it only receives input from the screen. Oricutron is the best, for many platforms, but on Android it doesnt work for reading local files etc.

Okay, as you may have heard, there was a virus going around... So I was stuck in Bangkok, Thailand, and even though it's opening up, inside the country I've gotten used to say inside.

## Simulator no Emulator?

Yes! That's correct. It only *simulates* the BASIC. It's not using the ROM, it's not emulating the beautiful 6502 CPU, or any other part of the hardware.

So... That's kind of limiting?

Yeah, maybe. It is the goal that inasmuch as possible, normal BASIC programs will "work", but it's really just simulated. So, it's not an exact and accurate simulation, just emulation. Keep in mind, that this is an "ORIC Improved", with some limtations lifted; like CURSET, CURMOVE, CUR

## HELP

Yes, it has a built-in HELP command, HELP for HELP and HELP DRAW for help on DRAW etc...

## Interfaces

You can access hardcoded examples by 

   CLOAD E:LCIRCLES

and to list them:

   DIR E:

You can save basic program (text format in your browser's LocalStorage):

   CSAVE L:MYPROG

and

   DIR L:

And, to get it back:

   CLOAD L:MYPROG

# Screen Tech

As we know, the ORICs had this crazy attributes that took up a "cell", either in TEXT-mode, or in HIRES-mode. It was a pain to program sometimes!

This pain is simulated, the TEXT screen, uses a "clever" (read crazy) way of using nested line-spans in HTML. Read the code and see if you can figure it out!

WHY? you cried. And you may be right. Probably, for speed it'd be better to use the canvas, but I had this idea about how to encode the TEXT mode attributes and "let the browser do it" - and so far, it seems to be working!

Slow? Yes, the original ORIC was slow too.

I'll try to do some benchmarks....

## LORES 

Do HELP LORES.

DRAW CURSET CURMOV CIRCLE all works, and they don't complain of drawing outside of the screen, a limitation I never liked.

The sixlets (six-pixel/char alt-charset graphics) works the same way as ORIC; it requires a screenn attribute to change to ALT-TEXT mode for each line---and as you very well know-LORES 1 does that for you. However, just "LORES" will not clear screen, but quote and keep the text!

There is a kind of Teletext style editor. It basically it's just an extention of ORIC's normal full screen editor but with some "missing keys"! CTRL-ALT toggles display of attribute as chars.

For graphics (LORES/HIRES)-mode, you can draw lines and interactively draw/undraw circles, do pixel-editing, etc. I call it GEDIT. It's activated by ALT-G.

You can save a screen-shot in localStorage in your browser using CTRL-W.

And please do save before going back in history. To cycle backwards through history use CTRL-K.

Oh, and well, you could try TEXT 50,50 and see what happens...

## HIRES !

Hires is implemented very much the same as on original ORIC---it's a variant of TEXT-mode, only the charset used has 6x1 pixels! So each character gives different pattern, unless it's an attribute. Tenically, it works the same way.

The screen is split; the bottom part have the  customary 3 text lines, which are part of the normal screen.

HIRES, TEXT does not clear the screen, and the 3 lines at the bottom DOES scroll up to "separate" text memory. (PEEK,POKE may get confused...)

Other fancy mixed modes aren't directly implementatble by attribute changes, currently NOT, it may be overkill... However, future HIRES commmand extention may provide higher-level facility.

## INVERSE

Works so so, CSS is tricky to get it completey correct, can't figure it out. It does something, but some colours can't be inverted correctly :-(. 

## Web extentions

So the ORIC-BASIC Simulator has a web-extention...

To see my website type:

   YESCO.ORG

Navigate using cursor keys, on links (blue), press return to follow!

       <   : to the first page
       b   : go back a page
       SPC : next page

       ESC : exit (clear screen)
       CTRL-C: break (don't clear screen)


Again, you may want to increase screen-size:

       -   : smaller font ("zoom out")
       +   : bigger font ("zoom in")

Or simulate a slow modem!
       1   : simulate speed of 1200 baud
       3   : 300 baud (human read & comprehend)
       9   : 969696 baud (full speed)
       
# Speed

My developement and test platform is all on a Xiaomi Note 6a mobile phone... Tools I love are emacs, cp, inotify, grep, less and for getting all this under Android I use the excellent Termux software - highly commended!

This is my benchmark program:

    7 LET A=0
    10 PRINT ".";
    12 LET A=A+1
    15 GOSUB 100
    20 GOTO 9
    100 PRINT A;
    110 RETURN

How the tests are performed:

Load the webpage in the browser.

Click for the page to get focus (Opera etc).

    LIST

To verify the code. Remove statements as needed (OK, I need to implement DEL!)

    RUN
    
Run for about 10s.

Then break with CTRL-C.

    PRINT A

Also, the lower part of the screen will show how many statements been processed, live. VARS will show the values of all variables...

## print numbers

(line 10 removed)

A got to nearly 6,000 in 10s, and that means 29K statements or so. About 3K statements per second.

What really kills the speed, is displaying data, and the painful SCROLLING which is embarrassing slow! (in my simulator)

What's the real speed on an ORIC?

## print dots

much faster, can't really see anything happening...

## no print

(laines 10 and 100 removed)

A got to 75K and it's processing about 302K statements in 10s, meaning 30K/s, when there is no PRINTs.

# Limitations

  * Only TEXT mode
  * No HIRES (yet!)
  * No blink (coming!)
  * Not "accurate" numbers, it's using javascrpt normal precision (for now)
  * Some things faster, some thing slower
  * Redefine charset, not complete yet, so don't  expect it to work
  * CLOAD "" only loads plain text basic file

= What do you need?

  * Keep in mind; this is an ORIC "imporoved", so graphics works in LORES etc.
  * Try out corner cases and show me transcript of what ORIC does and what mine does wrong?
  * Speed tests? For tuning.


## Files in this directory?

TODO: it may need to be moved out to another project...

## COPYRIGHT

Well, it's readable... It's basically AGPL, GNU Affero license. So contribute back changes.

But it's Open Source!

During the developement I would have been helped if ANY of the emulators were open, but I don't think they are? Correct me if I'm wrong...

## Logos

## Font

I generated the ttf-font file from ORIC; the alt-set is programmatically generated as a separate font. Technically, his is needed for the attribute automatic switch-over to function as intended.

## Other data

In the source code there are bits and pieces copied relating to the "facts" about the ORIC ATMOS to help define it's function. There are URL references to where it came from or was inspired.

## Oric Kong

This is the original Oric Kong written in plain BASIC, whose creator created a clone now written in C:

    ORIC/orickong.tap

I yet need to write a decoder for this kind of files... (for now see Xoric project!

# collected example files

    ORIC/bas2tap.js
    ORIC/oric-BomberZ.bas
    ORIC/oric-charset.bas
    ORIC/oric-graphics.bas
    ORIC/oric-hires.bas
    ORIC/oric.tap
    ORIC/txt2bas.c