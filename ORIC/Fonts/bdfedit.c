#include "stdio.h"
#include "string.h"
#include "stdlib.h"
#include "termios.h"
#include "u8.h"
#include "bdf.h"
#include <unistd.h>
#include <sys/mman.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include "oio.h"
#include "unidat.h"

/* editor for editing my neoletters font.
Written in 2019 by Oren Watson
*/

#define ei else if


const char * bdfeditlogo = "𝔅𝔇𝔉𝕖𝕕𝕚𝕥";


void show_uni_name(unsigned ch) {
	const char *s = get_unidat_entry(ch);
	if (!s) {
		printf("no unicode name\r\n");
	} else {
		int len = (char*)memchr(s,';',100)-s;
		printf("unicode_name %.*s\r\n",len,s);
	}
}

void show_help();

void showbar(int total, int cur, int wid) {
	if (total == 0)return;
	// full block 022610 -> one eighth block 022617 -> space 040
	int pix = cur * 8*wid / total;
	int fb = pix / 8;
	int px = pix % 8;
	int i = 0;
	while(i++<fb)fputs("\342\226\210",stdout);
	if(px!=0)printf("\342\226%c",0220-px);
	int bl = wid - fb - !!px;
	i = 0;
	while(i++<bl)putchar(' ');
}


void outputbigwithcur(struct bdfglyph *g, int y, int x){ //
	const char *const spa = "  ";
	const char *const blk = "██";
	const char *const spacur = "\033[32m▒▒\033[0m";
	const char *const blkcur = "\033[42m▒▒\033[0m";
	int j;
	int pixwid = get_eaw(g->encoding) * 9;
	for(j = 0;j < 16;j++) {
		unsigned b;
		int i;
		fputs("\e[0m║",stdout);
		for (i=0,b=0x20000;b!=0;b/=2,i++) {
			if (i == pixwid)fputs("\e[44m",stdout);
			if (i == x && j == y) {
				if(g->bitmap[j]&b) fputs(blkcur,stdout);
				else fputs(spacur,stdout);
			} else {
				if(g->bitmap[j]&b)fputs(blk,stdout);
				else fputs(spa,stdout);
			}
		}
		fputs("\e[0m║\n\r",stdout);
	}
}

void bdfedit_status(struct bdfglyph *g,int cur,int tot) {
	printf("\e[7H\e[Kstatus: U%05x\n\r\e[Kname: %s",g->encoding,g->name);
	printf("\e[2H%3d%%\e[36;43m",cur*100/tot);
	showbar(tot,cur,30);
	printf("\e[0m");
	outputasbitmap(g,3,1);
}

int main(int argc, char **argv){
	if(argc < 2) {
		printf("need a BDF to edit\n");
		return 0;
	}
	char filename[100];
	strcpy(filename,argv[1]);

	oio_setup();

	struct bdfglyph **font = (void*)calloc(0x20000,sizeof(void*));
	printf(CLRSCR TOPLEF BBLU "%s - loading unicode data\n\r" CLRCOL,bdfeditlogo);
	if(load_unidat()){
		oio_finish();
		printf("load_unidat failed\n");
		exit(1);
	}

	if(load_eawdat()){
		oio_finish();
		printf("load_eawdat failed\n");
		exit(1);
	}

	printf(CLRSCR TOPLEF BBLU "%s - loading %s\n\r" CLRCOL,bdfeditlogo,filename);
	struct bdfinfo fontinfo;
	load_font(filename,font,&fontinfo,bdfedit_status);

	/* editor state */
	int gi=60;// index of glyph being edited
	int y=0,x=0;// cursor position
	int redraw = 1;
	int i;
	struct bdfglyph *copied = NULL;
	int ci=60;
	while (1) {
		if(gi >= 0x20000)gi = 0x1FFFF;
		if(gi < 0)gi = 0;
		struct bdfglyph *g = font[gi];
		if(redraw){
			printf(CLRSCR TOPLEF "\033[44;96m%s %s\n\r" CLRCOL,bdfeditlogo,filename);
			if (g) {
				outputasbitmap(g,2,1);
				printf("\033[3;15H◌%s",u8chtostr(gi));
				printf("\033[6;1H");
				printf("character %x\r\n",g->encoding);
				show_uni_name(g->encoding);
				outputbigwithcur(g,y,x);
			} else {
				printf ("no character U%x\n\r",gi);
				show_uni_name(gi);
				printf ("(^A to add blank)");
			}
		}
		redraw = 1;
		int c = getkey();
		if (c == CTRL('Q')) {
			printf("\033[2J\033[H\033[44m%s - save+quit %s\n\r\033[0m",bdfeditlogo,filename);
			save_font(filename,font,&fontinfo,bdfedit_status);
			break; // quit
		}
		if (c == CTRL('S')) {
			printf(CLRSCR TOPLEF BBLU "%s - saving %s\n\r" CLRCOL,bdfeditlogo,filename);
			save_font(filename,font,&fontinfo,bdfedit_status);
		}
		ei (c == CTRL('X'))break;
		ei (c == CTRL('C') && g)copied = g, ci = gi;
		ei (c == CTRL('G')){
			int c;
			printf(GOLN(2)CLRLIN);
			do {
				c = oio_gethex(2,0,"go to char:",5,&gi);
			} while(c != KEY_ENTER && c != '\n');
		} ei (c == KEY_F1)show_help();
		ei (c == CTRL('A') && !g)font[gi] = make_blank_char(gi);
		ei (c == CTRL('K'))font[gi] = NULL;
		ei (c == CTRL('V') && copied) {
			free(g);
			font[gi] = g = copy_char(gi,copied);
		}
		ei (c == CTRL('W') && copied) {
			struct bdfglyph *x = copy_char(gi,copied);
			free(copied);
			font[ci] = copied = copy_char(ci,g);
			free(g);
			font[gi] = g = x;
		}
		ei (c == 'j') {
			for(i = 0; i < 16; i++)g->bitmap[i] = (g->bitmap[i] << 1) & 0x3FFFF;
		}
		ei (c == 'l') {
			for(i = 0; i < 16; i++)g->bitmap[i] = g->bitmap[i] >> 1;
		}
		ei (c == 'i') {
			for(i = 0; i < 15; i++)g->bitmap[i] = g->bitmap[i+1];
			g->bitmap[15] = 0;
		}
		ei (c == 'k') {
			for(i = 15; i >= 1; i--)g->bitmap[i] = g->bitmap[i-1];
			g->bitmap[0] = 0;
		}
		ei (c == KEY_UP && y > 0)y--;
		ei (c == KEY_DOWN && y < 15)y++;
		ei (c == KEY_LEFT && x > 0)x--;
		ei (c == KEY_RIGHT && x < 17)x++;
		ei (c == KEY_PGUP && gi > 0)gi--;
		ei (c == KEY_PGDN && gi < 0x1FFFF)gi++;
		ei (c == KEY_HOME) {
			if (gi > 0)gi--;
			while(gi > 0 && !font[gi])gi--;
		}
		ei (c == KEY_END) {
			if (gi < 0x1FFFF)gi++;
			while (gi < 0x1FFFF && !font[gi])gi++;
		}
		ei (c == 'd' && g)g->bitmap[y] |= (0x20000 >> x);
		ei (c == 'e' && g)g->bitmap[y] &= ~(0x20000 >> x);
		ei (c == ' ' && g)g->bitmap[y] ^= (0x20000 >> x);
		else redraw = 0;
	}
	printf("\e[7;1H");
	printf(CLRSCR TOPLEF BBLU "%s - unloading\n\r" CLRCOL,bdfeditlogo);
        for (i=0; i < 0x20000; i++) {
		if(font[i]) free(font[i]);
	}
	free(font);
        unload_unidat();
	unload_eawdat();
	oio_finish();
	return 0;
}

void show_help() {
	printf("\033[2J\033[HBDF EDIT - Help Screen\r\n");
	printf("[^Q] exit and save\n\r");
	printf("[^X] exit and do not save\n\r");
	printf("[^G] go to character code\n\r");
	printf("[^C] copy character\n\r");
	printf("[^V] paste character\n\r");
	printf("[^W] swap character\n\r");
	printf("[^A] add character\n\r");
	printf("[^K] del character\n\r");
	printf("[pgup] prev character\n\r");
	printf("[pgdn] next character\n\r");
	printf("[home] prev drawn character\n\r");
	printf("[end] next drawn character\n\r");
	printf("←↑→↓ move around the editing field\n\r");
	printf("[j|i|l|k] shift around the editing field\n\r");
	printf("[d] draw at cursor\n\r");
	printf("[e] erase at cursor\n\r");
	printf("[ ] toggle at cursor\n\r");
	printf("[F1] get help\n\r");
	printf("[enter] leave help\n\r");
	while(1) {
		int c = getkey();
		if(c == CTRL('Q'))break;
		if(c == CTRL('X'))break;
		if(c == '\r')break;
	}
}

