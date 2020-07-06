#include "stdio.h"
#include "stdlib.h"
#include "termios.h"

#define ei else if

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

// jsk
#define CTRL(C) ((C)-64)

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
		}
		return c+KEY_ALT;
	}
	return c;
}
unsigned oterm_get_hex(int y, char *prompt) {
	unsigned num = 0;
	while(1) {
		printf("\033[%d;0H\033[2K%s %x",y,prompt,num);
		int c = getkey();
		if (c == EOF || c == '\r')break;
		if (c >= '0' && c <= '9')num = num * 16 + c - '0';
		if (c >= 'A' && c <= 'F')num = num * 16 + c - 'A' + 10;
		if (c >= 'a' && c <= 'f')num = num * 16 + c - 'a' + 10;
		if (c == '\b')num /= 16;
	}
	return num;
}

struct bdfglyph {
	char name[16];
	int encoding;
	int dwidth;
	int bbox[4];
	unsigned bitmap[16];
};

struct bdfglyph *make_blank_char(unsigned gi) {
	struct bdfglyph *g = calloc(1,sizeof(struct bdfglyph));
	g->encoding = gi;
	sprintf(g->name,"uni%X",gi);
	g->dwidth = 18;
	return g;
}

unsigned leftshft(unsigned x,int i){
	if(i>0)return x << i;
	if(i<0)return x >> -i;
	return x;
}

int outputasbitmap(struct bdfglyph *g){
		int j;
		for(j=0;j<4;j++){
			int b;
			for (b=0x20000;b!=0;b/=4) {
				int t =   (g->bitmap[j*4]&b	?0x01:0x00)
					| (g->bitmap[j*4]&(b/2)	?0x08:0x00)
					| (g->bitmap[j*4+1]&b  	?0x02:0x00)
					| (g->bitmap[j*4+1]&(b/2)?0x10:0x00)
					| (g->bitmap[j*4+2]&b	?0x04:0x00)
					| (g->bitmap[j*4+2]&(b/2)?0x20:0x00)
					| (g->bitmap[j*4+3]&b    ?0x40:0x00)
					| (g->bitmap[j*4+3]&(b/2)?0x80:0x00);
				printf("\342%c%c",(t>>6)|0240,(t&077)|0200);
			}
			printf("\n\r");
		}
}

void outputbigwithcur(struct bdfglyph *g, int y, int x){ //
	const char *const spa = "  ";
	const char *const blk = "â–ˆâ–ˆ";
	const char *const spacur = "\033[32mâ–’â–’\033[0m";
	const char *const blkcur = "\033[42mâ–’â–’\033[0m";
	printf("character %x\r\n",g->encoding);// encoding number not editable directly
	printf("name: %s",g->name);
	if(y == -1){printf("â–ˆ");}
	printf("\n\r");
	int j;
	for(j = 0;j < 16;j++) {
		unsigned b;
		int i;
		for (i=0,b=0x20000;b!=0;b/=2,i++) {
			if (i == x && j == y) {
				if(g->bitmap[j]&b) fputs(blkcur,stdout);
				else fputs(spacur,stdout);
			} else {
				if(g->bitmap[j]&b)fputs(blk,stdout);
				else fputs(spa,stdout);
			}
		}
		fputs("\n\r",stdout);
	}
}



char line[300];

int main(int argc, char **argv){
	FILE *bdfin = fopen(argv[1],"r");
	FILE *bdfout = fopen("out.bdf","w");

	do {
		fgets(line,300,bdfin);
		if (!strncmp(line,"CHARS ",6)) break;
//		fputs(line,bdfout);
		printf("%s",line);
	} while(1);

	int nchars;
	sscanf(line,"CHARS %d",&nchars);
	//printf("allocation %d chars\n",nchars);
	struct bdfglyph **font = (void*)calloc(0x20000,sizeof(void*)); // BMP and SMP

	do {
		struct bdfglyph g;
		if(!fgets(line,300,bdfin))break;
		if(!strncmp(line,"ENDFONT",7))break;
		sscanf(line,"STARTCHAR %16s",g.name);
		fgets(line,300,bdfin);
		int ccode;
		sscanf(line,"ENCODING %d",&g.encoding);
		ccode = g.encoding;

		printf("status: U%05x\n",ccode);
		do fgets(line,300,bdfin);
		while(strncmp(line,"DWIDTH",6));
		int dwidth;
		sscanf(line,"DWIDTH %d",&g.dwidth);
		fgets(line,300,bdfin);
		sscanf(line,"BBX %d %d %d %d",g.bbox,g.bbox+1,g.bbox+2,g.bbox+3); 
		// width, height, x offset, y offset (of lower left corner)
		fgets(line,300,bdfin);
		sscanf(line,"BITMAP");
		int bwidth = g.bbox[0]/8 + !!(g.bbox[0]%8);
		int bottom = 12 - g.bbox[3];
		int top = bottom - g.bbox[1];
		int lsb = g.bbox[2];
		int j,i;
		unsigned bitmap[16];
		for(j=0;j<g.bbox[1];j++){
			fgets(line,300,bdfin);
			sscanf(line,"%x",bitmap+j);
		}
		for(j=0;j<16;j++){
			g.bitmap[j]=0;
			if(j >= top && j < bottom) {
				int k = j - top;
				g.bitmap[j] = leftshft(bitmap[k],18 - bwidth * 8 - lsb);
			}
		}
		//outputasbitmap(g);
		font[ccode] = (struct bdfglyph*)malloc(sizeof(struct bdfglyph));
		*font[ccode] = g;
		do fgets(line,300,bdfin);
		while(strncmp(line,"ENDCHAR",7));

	}while(1);

	struct termios oldterm;
	struct termios rawterm;
	tcgetattr(0,&oldterm);
	cfmakeraw(&rawterm);
	tcsetattr(0,TCSANOW,&rawterm);

	/* editor state */
	int gi=60;// index of glyph being edited
	int y=0,x=0;// cursor position
	int redraw = 1;
	while (1) {
		if(gi >= 0x20000)gi = 0x1FFFF;
		struct bdfglyph *g = font[gi];
		if(redraw){
			printf("\033[2J\033[HBDF EDIT [^Q exit] [^G go to]\r\n");
			if (g) {
				outputasbitmap(g);
				outputbigwithcur(g,y,x);
			} else {
				printf ("no character U%x\n\r",gi);
				printf ("(^A to add blank)");
			}
		}
		redraw = 1;
		int c = getkey();
		if (c == CTRL('Q'))break; // quit
		ei (c == CTRL('G'))gi = oterm_get_hex(2,"go to char:");
		ei (c == CTRL('A') && !g)font[gi] = make_blank_char(gi);
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
	tcsetattr(0,TCSANOW,&oldterm);

	/* now, output edited font */
	unsigned charcount = 0; //count the characters in font
	for (gi = 0; gi < 0x20000; gi++) {
		if(font[gi])charcount++;
	}
	fprintf(bdfout,"STARTFONT 2.1\n");
	fprintf(bdfout,"FONT neoletters\n");
	fprintf(bdfout,"SIZE 12 75 75\n");
	fprintf(bdfout,"FONTBOUNDINGBOX 18 16 0 -4\n");
	fprintf(bdfout,"STARTPROPERTIES 3\n");
	fprintf(bdfout,"PIXEL_SIZE 16\n");
	fprintf(bdfout,"FONT_ASCENT 12\n");
	fprintf(bdfout,"FONT_DESCENT 4\n");
	fprintf(bdfout,"ENDPROPERTIES\n");
	fprintf(bdfout,"CHARS %d\n",nchars);
	for (gi = 0; gi < 0x20000; gi++) {
		struct bdfglyph *g = font[gi];
		if(!g)continue;
		fprintf(bdfout,"STARTCHAR %s\n",g->name);
		fprintf(bdfout,"ENCODING %d\n",gi);
		fprintf(bdfout,"SWIDTH %d 0\n",g->dwidth*500/8);
		fprintf(bdfout,"DWIDTH %d 0\n",g->dwidth);
		/*calculate bounding box*/
		int j;
		unsigned orsum=0;
		int topnonzero = -1;
		int botnonzero = -1;
		for(j=0;j<16;j++){
			orsum |= g->bitmap[j];
			if(topnonzero == -1 && g->bitmap[j] != 0) topnonzero = j;
			if(g->bitmap[j] != 0) botnonzero = j;
		}
		int height = botnonzero - topnonzero + 1;
		int yoff = 11 - botnonzero;
		if (botnonzero == -1)yoff = 0;
		int i;
		int lefnonzero = -1;
		int rignonzero = -1;
		for(i=0;i<18;i++){
			int p = !!((0x20000>>i)&orsum);
			if(p) rignonzero = i;
			if(p && lefnonzero == -1) lefnonzero = i;
		}
		int width = rignonzero - lefnonzero + 1;
		int xoff = lefnonzero;
		if(lefnonzero == -1)xoff = 0;
		int bytes = width%8 ? width/8+1 : width/8;
		int zershift = 17-rignonzero;
		int byteshift = bytes*8-width;
		fprintf(bdfout,"BBX %d %d %d %d\nBITMAP\n",width,height,xoff,yoff);
		for(j=topnonzero;j<=botnonzero;j++){
			fprintf(bdfout,"%0*X\n",bytes*2,(g->bitmap[j]>>zershift)<<byteshift);
		}
		fprintf(bdfout,"ENDCHAR\n");
	}
	fprintf(bdfout,"ENDFONT\n");
}
