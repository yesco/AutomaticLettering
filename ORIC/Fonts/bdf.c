#include "stdlib.h"
#include "stdio.h"
#include "string.h"
#include "bdf.h"
#include "u8.h"

unsigned leftshft(unsigned x,int i){
	if(i>0)return x << i;
	if(i<0)return x >> -i;
	return x;
}

int strprfx(char *s, char *p) {
	return strncmp(s,p,strlen(p));
}

void chomp(char *s){
	int i = strlen(s);
	if(s[i-1] == '\n')s[i-1] = 0;
}

struct bdfglyph *make_blank_char(unsigned gi) {
	struct bdfglyph *g = calloc(1,sizeof(struct bdfglyph));
	g->encoding = gi;
	sprintf(g->name,"uni%X",gi);
	g->dwidth = u8chrwidn(gi)*9;
	return g;
}

struct bdfglyph *copy_char(unsigned gi, struct bdfglyph *gc) {
	struct bdfglyph *g = malloc(sizeof(struct bdfglyph));
	*g = *gc;
	g->encoding = gi;
	sprintf(g->name,"uni%X",gi);
	g->dwidth = u8chrwid(gi)*9;
	return g;
}

void calc_bbx(struct bdfglyph *g){
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
	g->bbx[0] = width;
	g->bbx[1] = height;
	g->bbx[2] = xoff;
	g->bbx[3] = yoff;
}

struct io_info {
	int shift; // left for input, right for output
	int top; // first row to output
	int bot; // one after last row to output
	int bytes; // bytes to output
};

struct io_info calc_io_info(struct bdfglyph *g){
	int width = g->bbx[0];
	int height = g->bbx[1];
	int xoff = g->bbx[2];
	int yoff = g->bbx[3];
	int bwidth = width/8 + !!(width%8);
	struct io_info o;
	o.bot = 12 - yoff;
	o.top = o.bot - height;
	o.shift = 18 - bwidth * 8 - xoff;
	o.bytes = bwidth;
	return o;
}

void load_font(const char * filename, struct bdfglyph **font, struct bdfinfo *info, void(*status_callback)(struct bdfglyph *g, int cur, int tot)){
	FILE *bdfin = fopen(filename,"r");
	char line[300];
	do {
		if(!fgets(line,300,bdfin))return;
		chomp(line);
		if (!strprfx(line,"FONT "))strcpy(info->name,line+5);
		if (!strprfx(line,"SIZE "))sscanf(line,"SIZE %d %d",&info->size,&info->dpi);
		if (!strprfx(line,"FONTBOUNDINGBOX ")) sscanf(line,"FONTBOUNDINGBOX %d %d %d %d",info->bbx,info->bbx+1,info->bbx+2,info->bbx+3);
		if (!strprfx(line,"STARTPROPERTIES ")){
			sscanf(line,"STARTPROPERTIES %d",&info->nprops);
			info->prop_lines = malloc(sizeof(char*)*MAX_FONT_PROPS);
			int pi=0;// properties iterator.
			do {
				if(!fgets(line,300,bdfin))return;
				chomp(line);
				if(!strprfx(line,"ENDPROPERTIES"))break;
				info->prop_lines[pi] = malloc(300);
				strcpy(info->prop_lines[pi],line);
				pi++;
			}while(pi < info->nprops);
		}
		if (!strprfx(line,"CHARS ")) break;
	} while(1);

	sscanf(line,"CHARS %d",&info->nchars);
	int count = 0;
	do {
		struct bdfglyph g;
		if(!fgets(line,300,bdfin))break;
		if(!strprfx(line,"ENDFONT"))break;
		sscanf(line,"STARTCHAR %16s",g.name);
		if(!fgets(line,300,bdfin))break;
		int ccode;
		sscanf(line,"ENCODING %d",&g.encoding);
		ccode = g.encoding;

		do if(!fgets(line,300,bdfin))break;
		while(strprfx(line,"DWIDTH"));
		sscanf(line,"DWIDTH %d",&g.dwidth);
		if(!fgets(line,300,bdfin))break;
		sscanf(line,"BBX %d %d %d %d",g.bbx,g.bbx+1,g.bbx+2,g.bbx+3); 
		if(!fgets(line,300,bdfin))break;
		sscanf(line,"BITMAP");
		struct io_info O = calc_io_info(&g);
		int j;
		for(j=0;j<16;j++){
			g.bitmap[j]=0;
			if(j >= O.top && j < O.bot) {
				if(!fgets(line,300,bdfin))break;
				unsigned x;
				sscanf(line,"%x",&x);
				g.bitmap[j] = leftshft(x,O.shift);
			}
		}
		if(status_callback)status_callback(&g,count,info->nchars);
		font[ccode] = (struct bdfglyph*)malloc(sizeof(struct bdfglyph));
		*font[ccode] = g;
		do j = !!fgets(line,300,bdfin);
		while(j && strprfx(line,"ENDCHAR"));
		count++;
	}while(1);
	fclose(bdfin);

}

void save_font(const char * filename, struct bdfglyph **font, struct bdfinfo *info, void(*status_callback)(struct bdfglyph *g, int cur, int tot)){
	FILE *bdfout = fopen(filename,"w");
	unsigned gi;
	unsigned charcount = 0; //count the characters in font
	for (gi = 0; gi < 0x20000; gi++) {
		if(font[gi])charcount++;
	}
	fprintf(bdfout,"STARTFONT 2.1\n");
	fprintf(bdfout,"FONT %s\n",info->name);
	fprintf(bdfout,"SIZE %d %d %d\n", info->size, info->dpi, info->dpi);
	fprintf(bdfout,"FONTBOUNDINGBOX %d %d %d %d\n", info->bbx[0], info->bbx[1], info->bbx[2], info->bbx[3]);
	fprintf(bdfout,"STARTPROPERTIES %d\n", info->nprops);
	int pi = 0;
	while(pi < info->nprops) {
		fprintf(bdfout,"%s\n",info->prop_lines[pi]);
		pi++;
	}
	fprintf(bdfout,"ENDPROPERTIES\n");
	fprintf(bdfout,"CHARS %d\n",charcount);
	int outcount = 0;
	for (gi = 0; gi < 0x20000; gi++) {
		struct bdfglyph *g = font[gi];
		if(!g)continue;
		g->dwidth = u8chrwidn(gi)*9;
		if(status_callback)status_callback(g,outcount,charcount);
		fprintf(bdfout,"STARTCHAR %s\n",g->name);
		fprintf(bdfout,"ENCODING %d\n",gi);
		fprintf(bdfout,"SWIDTH %d 0\n",g->dwidth*500/8);
		fprintf(bdfout,"DWIDTH %d 0\n",g->dwidth);
		calc_bbx(g);
		fprintf(bdfout,"BBX %d %d %d %d\nBITMAP\n",g->bbx[0],g->bbx[1],g->bbx[2],g->bbx[3]);
		struct io_info O = calc_io_info(g);
		int j;
		for(j=O.top;j<O.bot;j++){
			fprintf(bdfout,"%0*X\n",O.bytes*2,leftshft(g->bitmap[j],-O.shift));
		}
		fprintf(bdfout,"ENDCHAR\n");
		outcount++;
	}
	fprintf(bdfout,"ENDFONT\n");
	fclose(bdfout);
}


/* 4 lines tall */
void outputasbitmap(struct bdfglyph *g,int y, int x){
		int j;
		for(j=0;j<4;j++){
			int b;
			printf("\033[%d;%dH",y+j,x);
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
		}
}

