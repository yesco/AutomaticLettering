/* OIO 0.1 */

#include "termios.h"
#include "stdio.h"
/* to set the raw mode:
	struct termios oldterm;
	struct termios rawterm;
	tcgetattr(0,&oldterm);
	cfmakeraw(&rawterm);
	tcsetattr(0,TCSANOW,&rawterm);

to reset it:
	tcsetattr(0,TCSANOW,&oldterm);
*/

#define KEY_ENTER '\r'
#define KEY_TAB '\t'
#define KEY_BKSP '\177'

#define KEY_ALT 0x400000
#define KEY_UP 0x200001
#define KEY_DOWN 0x200002
#define KEY_LEFT 0x200003
#define KEY_RIGHT 0x200004
#define KEY_HOME 0x200005
#define KEY_END 0x200006
#define KEY_INS 0x200007
#define KEY_DEL 0x200008
#define KEY_PGUP 0x200009
#define KEY_PGDN 0x200010
#define KEY_F1 0x200011
#define KEY_F2 0x200012
#define KEY_F3 0x200013
#define KEY_F4 0x200014

/* basic functions */

int getkey();
void oio_setup ();
void oio_finish ();

/* io functions *
****************
each get function creates a input interface for the user, and interprets keys
that it recognizes, exiting on certain unrecognized keys. The functions
return the key they exited on, allowing them to be interpreted by the calling
function.
the corresponding sho function displays the interface but doesn't read input.
single line functions with no editing exit on enter, all directions, and tab.
single line functions with editing exit on enter, up, down, and tab.
multi line functions exit primarily on tab.
*/

/* integer input, single line, no editing */
int oio_getint(int y,int x,char *prompt,int w,int *a);
void oio_shoint(int y,int x,char *prompt,int w,int *a);
/* hexadecimal input, single line, no editing */
int oio_gethex(int y,int x,char *prompt,int w,unsigned *a);
void oio_shohex(int y,int x,char *prompt,int w,unsigned *a);
/* string input, single line with editing */
int oio_getstredit(int y,int x,char *prompt,char *str,int w);
/* string input, single line, no editing */
int oio_getstr(int y,int x,char *prompt,char *str,int w);
void oio_shostr(int y,int x,char *prompt,char *str,int w);


/* strings */

#define CSI "\033["
#define TRED CSI"31m"
#define TGRN CSI"32m"
#define TYEL CSI"33m"
#define TBLU CSI"34m"
#define TMAG CSI"35m"
#define TCYN CSI"36m"
#define TGRY CSI"37m"
#define BRED CSI"41m"
#define BGRN CSI"42m"
#define BYEL CSI"43m"
#define BBLU CSI"44m"
#define BMAG CSI"45m"
#define BCYN CSI"46m"
#define BGRY CSI"47m"
#define TBRED CSI"1;31m"
#define TBGRN CSI"1;32m"
#define TBYEL CSI"1;33m"
#define TBBLU CSI"1;34m"
#define TBMAG CSI"1;35m"
#define TBCYN CSI"1;36m"
#define TBGRY CSI"1;37m"
#define CLRCOL CSI"0m"
#define CLRSCR CSI"2J"
#define CLRBEL CSI"0J"
#define CLRLIN CSI"2K"
#define TOPLEF CSI"H"
#define GOLN(X) CSI #X "H"
#define GOYX(Y,X) CSI #Y";"#X "H"

