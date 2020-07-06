/* OIO 0.1 */

#include "stdio.h"
#include "string.h"
#include "oio.h"
#include "termios.h"

struct termios oio_oldterm;
struct termios oio_rawterm;

void oio_setup () {
	tcgetattr(0,&oio_oldterm);
	cfmakeraw(&oio_rawterm);
	tcsetattr(0,TCSANOW,&oio_rawterm);
	fputs(CLRSCR,stdout);
}

void oio_finish () {
	tcsetattr(0,TCSANOW,&oio_oldterm);
}

void oio_shoint(int y,int x,char *prompt,int w,int *a) {
	printf(CSI"%d;%dH%s%*d",y,x,prompt,w,*a);
}

int oio_getint(int y,int x,char *prompt,int w,int *a) {
	oio_shoint(y,x,prompt,w,a);
	int c = getkey();
	while(c != KEY_ENTER){
		if(c >= '0' && c <= '9') *a = *a*10+(c-'0');
		if(c == KEY_BKSP) *a /= 10;
		if(c == '-') *a = -*a;
		if(c == KEY_TAB) return c;
		if(c == KEY_UP) return c;
		if(c == KEY_DOWN) return c;
		if(c == KEY_LEFT) return c;
		if(c == KEY_RIGHT) return c;
		oio_shoint(y,x,prompt,w,a);
		c = getkey();
	}
	printf(TOPLEF CLRCOL);
	return KEY_ENTER;
}


void oio_shostr(int y,int x,char *prompt,char *str,int w) {
	printf(CSI"%d;%dH%s%-*s"CSI"%dD",y,x,prompt,w,str,w-(int)strlen(str));
}

int oio_getstr(int y,int x,char *prompt,char *str,int w) {
	int i = strlen(str);
	oio_shostr(y,x,prompt,str,w);
	int c = getkey();
	while(c != KEY_ENTER){
		if(c == KEY_LEFT) return c;
		else if(c == KEY_RIGHT) return c;
		else if(c == KEY_HOME) return c;
		else if(c == KEY_END) return c;
		else if(c == KEY_BKSP && i > 0){
			i--;
			str[i] = 0;
		}
		else if(c == KEY_UP) return c;
		else if(c == KEY_DOWN) return c;
		else if(c >= ' ' && strlen(str) < w){
			str[i] = c;
			i++;
			str[i] = 0;
		}
		oio_shostr(y,x,prompt,str,w);
		c = getkey();
	}
	printf(TOPLEF CLRCOL);
	return KEY_ENTER;
}

int oio_getstredit(int y,int x,char *prompt,char *str,int w) {
	int i = strlen(str);
	printf(CSI"%d;%dH%s%-*s"CSI"%dD",y,x,prompt,w,str,w-i);
	int c = getkey();
	while(c != KEY_ENTER){
		if(c == KEY_LEFT){
			if(i > 0) i--;
			else return c;
		}else if(c == KEY_RIGHT){
			if(i < strlen(str))i++;
			else return c;
		}else if(c == KEY_HOME) i=0;
		else if(c == KEY_END) i=strlen(str);
		else if(c == KEY_BKSP && i > 0){
			strcpy(str + i-1, str + i);
			i--;
		} else if(c >= ' ' && c < KEY_UP && strlen(str) < w){
			strcpy(str + i+1, str + i);
			str[i] = c;
			i++;
		} else return c;
		printf(CSI"%d;%dH%s%-*s"CSI"%dD",y,x,prompt,w,str,w-i);
		c = getkey();
	}
	printf(TOPLEF CLRCOL);
	return KEY_ENTER;
}

void oio_shohex(int y,int x,char *prompt,int w,unsigned *a) {
	printf(CSI"%d;%dH%s%*x",y,x,prompt,w,*a);
}

int oio_gethex(int y,int x,char *prompt,int w,unsigned *a) {
	oio_shohex(y,x,prompt,w,a);
	int c = getkey();
	while(1) {
		if (c >= '0' && c <= '9')*a = *a * 16 + c - '0';
		else if (c >= 'A' && c <= 'F')*a = *a * 16 + c - 'A' + 10;
		else if (c >= 'a' && c <= 'f')*a = *a * 16 + c - 'a' + 10;
		else if(c == KEY_BKSP) *a /= 16;
		else return c;
		oio_shohex(y,x,prompt,w,a);
		c = getkey();
        }
}

int getkey(){
	int c = getchar();
	if(c == EOF)return EOF;
	if(c == 033){
		c = getchar();
		if(c == '['){
			c = getchar();
			if(c=='A')return KEY_UP;
			if(c=='B')return KEY_DOWN;
			if(c=='C')return KEY_RIGHT;
			if(c=='D')return KEY_LEFT;
			if(c=='1') {
				c = getchar();
				if(c=='~')return KEY_HOME;
				if(c=='1')return KEY_F1;
			}
			if(c=='2') {
				c = getchar();
				if(c=='~')return KEY_INS;
			}
			if(c=='3') {
				c = getchar();
				if(c=='~')return KEY_DEL;
			}
			if(c=='4') {
				c = getchar();
				if(c=='~')return KEY_END;
			}
			if(c=='5') {
				c = getchar();
				if(c=='~')return KEY_PGUP;
			}
			if(c=='6') {
				c = getchar();
				if(c=='~')return KEY_PGDN;
			}
		}else if(c == 'O'){
			c = getchar();
			if(c=='F')return KEY_HOME;
			if(c=='H')return KEY_END;
			if(c=='P')return KEY_F1;
			if(c=='Q')return KEY_F2;
			if(c=='R')return KEY_F3;
			if(c=='S')return KEY_F4;
		}
		return c+KEY_ALT;
	}
	return c;
}


