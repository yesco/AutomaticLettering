/* this program is designed to convert my neoletters font into a ttf */

#include "stdio.h"
#include "stdint.h"
#include "string.h"
#include "stdlib.h"
#include "time.h"
#include "ctype.h"
#include "byteswap.h"
//#include "u8.h"
//#include "bdf.h"
#include "oio.h"

// jsk: there was no makefile or compile command, just do this!
#include "bdf.c"
#include "u8.c"

#define ei else if
int xdgval(int c){
	if(c >= '0' && c <= '9')return c - '0';
	if(c >= 'A' && c <= 'F')return c - 'A' + 10;
	if(c >= 'a' && c <= 'f')return c - 'a' + 10;
	return 0;
}

uint32_t read32(FILE *f){
	uint32_t c;
	fread(&c,4,1,f);
	return bswap_32(c);
}

void write32(FILE *f,uint32_t c){
        c = bswap_32(c);
	fwrite(&c,4,1,f);
}

void write64(FILE *f,uint64_t c){
	c = bswap_64(c);
	fwrite(&c,8,1,f);
}

void writestr(FILE *f,char*s){
	fwrite(s,1,strlen(s),f);
}

void writeu16hack(FILE *f,char*s,int len){
	char *ss=alloca(len*2);
	int i;
	for(i=0;i<len;i++){
		ss[i*2]=0;
		ss[i*2+1]=s[i];
	}
	fwrite(ss,1,len*2,f);
}

uint16_t read16(FILE *f){
	uint16_t c;
	fread(&c,2,1,f);
	return bswap_16(c);
}

void write16(FILE *f, uint16_t c){
	c = bswap_16(c);
	fwrite(&c,2,1,f);
}

void write8(FILE *f, uint8_t c){
	fwrite(&c,1,1,f);
}

void goloc(FILE *f, long loc){
	fseek(f,loc,SEEK_SET);
}

void gorel(FILE *f, long x){
	fseek(f,x,SEEK_CUR);
}

void ffastfw(FILE *f){
	fseek(f,0,SEEK_END);
}

void writenameent(FILE *f,FILE *sf, int plat,int code,int lang, int name,char *s){
	write16(f,plat);//windows
	write16(f,code);//ucs
	write16(f,lang);//english
	write16(f,name);//name id 1 font family
	int len = strlen(s);
	if(plat == 1) {
		write16(f,len);//string length
		write16(f,ftell(sf)); //offset
		fwrite(s,len,1,sf);
	} else if (plat == 3) {
		write16(f,len*2);//string length
		write16(f,ftell(sf)); //offset
		writeu16hack(sf,s,len);
	}
}

void makepathmap(struct bdfglyph*g);
//temporary storage;
char line[300];
char pathmap[17*19];
struct point {char x,y,start;} pathlist[17*19*2];
int pathend;

int bdfpthchk(struct bdfglyph g,int x,int y);
void addpath(int x,int y);

void writefile(FILE *f,FILE*g){
	rewind(g);
	int c;
	while((c=fgetc(g))!=EOF)fputc(c,f);
}

unsigned writeblanktable(FILE *f,char*s){
	writestr(f,s);
	unsigned x = ftell(f);
	write32(f,0);//cksum
	write32(f,0);//location
	write32(f,0);//length
	return x;
}

void finalizetable(FILE *f,unsigned tblent,unsigned tblloc,unsigned tbllen){
	int padc = tbllen % 4;
	if(padc==1)fwrite("\0\0\0",1,3,f);
	if(padc==2)fwrite("\0\0",1,2,f);
	if(padc==3)fwrite("\0",1,1,f);
	unsigned lenwpad = tbllen/4 + (padc?1:0);
	uint32_t sum = 0;
	goloc(f,tblloc);
	int i;
	for(i=0;i<lenwpad;i++)sum += read32(f);
	goloc(f,tblent);
	write32(f,sum);
	write32(f,tblloc);
	write32(f,tbllen);
	ffastfw(f);
	if(ftell(f) % 4 != 0){printf("ERRO misaligned padc=%d ftell=%ld tblloc=%d tbllen=%d\n",padc,ftell(f),tblloc,tbllen);exit(1);}
}

void checkext(char *name, char *ext){
	char *i = name;
	char *j = ext;
	while(*i)i++;
	while(*j)j++;
	while(j >= ext){
		if(*i != *j){
			fprintf(stderr,"Extension mismatch: %s want %s\r\n",name,ext);
			abort();
		}
		i--;j--;
	}
}

void showbar(int total, int cur, int wid) {
	if (total == 0)return;
	int i,pix = cur * 8*wid / total;
	for(i=0;i<pix/8;i++)fputs("\342\226\210",stdout);
	if(pix%8!=0)printf("\342\226%c",0220-pix%8);
	int bl = wid - pix/8 - !!(pix%8);
	for(i=0;i<bl;i++)putchar(' ');
}

void bdf2ttf_status(struct bdfglyph *g,int cur,int tot) {
	printf(GOLN(8)CLRLIN"status: U%05x\n\r"CLRLIN"name: %s",g->encoding,g->name);
	printf(GOLN(3)"%3d%%"TCYN BYEL,cur*100/tot);
	showbar(tot,cur,30);
	printf(CLRCOL);
	outputasbitmap(g,4,1);
}

int main (int argc, char**argv) {
	printf(CLRSCR TOPLEF BRED "Oren's 𝔹𝔻𝔽 2 𝑻𝑻𝑭" CLRCOL "\n");

	char * bdfname = "in.bdf";
	char * ttfname = "out.ttf";
	if (argc > 1)bdfname = argv[1];
	if (argc > 2)ttfname = argv[2];
	checkext(bdfname,"bdf");
	checkext(ttfname,"ttf");

	FILE *out = fopen(ttfname,"w+");
        if(!out){
		printf(TRED TOPLEF "Error, could not open output file" CLRCOL "\r\n");
		abort();
	}
	printf(GOLN(2)"Loading BDF %s",bdfname);
	struct bdfglyph **font = (void*)calloc(0x20000,sizeof(void*));
	struct bdfinfo fontinfo;
	load_font(bdfname,font,&fontinfo,bdf2ttf_status);

	printf(GOLN(2)CLRBEL "Writing TTF Tables: %s",fontinfo.name);
	printf(GOLN(3)TYEL"[OS/2][cmap][cvt ][glyf][head][hhea][hmtx][loca][maxp][name][post]"CLRCOL);
	/* write ttf file header */
	write32(out,0x00010000);
	write16(out,11);
	write16(out,128);
	write16(out,3);
	write16(out,48);
	unsigned os2ent = writeblanktable(out,"OS/2"); // the table entries
	unsigned cmapent = writeblanktable(out,"cmap");
	unsigned cvtent = writeblanktable(out,"cvt ");
	unsigned glyfent = writeblanktable(out,"glyf");
	unsigned headent = writeblanktable(out,"head");
	unsigned hheaent = writeblanktable(out,"hhea");
	unsigned hmtxent = writeblanktable(out,"hmtx");
	unsigned locaent = writeblanktable(out,"loca");
	unsigned maxpent = writeblanktable(out,"maxp");
	unsigned nameent = writeblanktable(out,"name");
	unsigned postent = writeblanktable(out,"post");

	unsigned UPM = fontinfo.bbx[1];
        int xmin = fontinfo.bbx[2];
        int xmax = xmin + fontinfo.bbx[0];
        int ymin = fontinfo.bbx[3];
        int ymax = ymin + fontinfo.bbx[1];

	unsigned cvtloc = ftell(out);
	write32(out,0x00000000);//AAAAAAAAA
	unsigned cvtlen = ftell(out) - cvtloc;
	finalizetable(out,cvtent,cvtloc,cvtlen);
	printf(GOYX(3,13)TBCYN"[cvt ]"CLRCOL);

	/* write the head table */
	unsigned headloc = ftell(out);
	write16(out,1);//major
	write16(out,0);//minor
	write32(out,0x00010000);//font version
	write32(out,0);//checksumadjustment
	write32(out,0x5F0F3CF5);//magic number
	write16(out,0x0000);//flags
	write16(out,UPM);//units per em
	write64(out,time(0) + 24107ULL * 86400ULL);//date created
	write64(out,time(0) + 24107ULL * 86400ULL);//date modified
	write16(out,xmin);//xmin
	write16(out,ymin);//ymin
	write16(out,xmax);//xmax
	write16(out,ymax);//ymax
	write16(out,0);//macstyle
	write16(out,8);//lowest recommended ppem
	write16(out,2);// deprecated set to 2
	write16(out,1);// 0 short/long 1 format for loca table
	write16(out,0);// glyph data format, always 0
	unsigned headlen = ftell(out) - headloc;
	finalizetable(out,headent,headloc,headlen);
	printf(GOYX(3,25)TGRN"[head]"CLRCOL);

	/*write the hhea table*/
	unsigned hhealoc = ftell(out);
	write16(out,1);
	write16(out,0);
	write16(out,ymax);//ascent
	write16(out,ymin);//descent
	write16(out,0);//line gap
	write16(out,xmax);//max advance width
	write16(out,0);//min left sidebearing
	write16(out,0);//min right sidebearing
	write16(out,xmax);//max extent
	write16(out,0);//slope rise
	write16(out,1);//slope run
	write16(out,0);//slant shift
	write16(out,0);//reserved
	write16(out,0);//reserved
	write16(out,0);//reserved
	write16(out,0);//reserved
	write16(out,0);//metric data fmt always 0
	write16(out,fontinfo.nchars);//number of hmtx
	unsigned hhealen = ftell(out) - hhealoc;
	finalizetable(out,hheaent,hhealoc,hhealen);
	printf(GOYX(3,31)TBCYN"[hhea]"CLRCOL);

	/*write the OS/2 table*/
	unsigned os2loc = ftell(out);
	write16(out,4);
	write16(out,UPM*9/16);//average width
	write16(out,500);//Medium Weight
	write16(out,5);//Medium Width
	write16(out,0);//fstype
	write16(out,UPM);//subscript x size
	write16(out,UPM/2);//subscript y size
	write16(out,0);//subscript x offset
	write16(out,UPM/4);//subscript y offset
	write16(out,UPM);//superscript x size
	write16(out,UPM/2);//superscript y size
	write16(out,0);//superscript x offset
	write16(out,UPM/4);//superscript y offset
	write16(out,UPM*2/16);//strikeout size
	write16(out,UPM/4);//strikeout position
	write8(out,8);// neoletters is a sans serif
	write8(out,3);// geometric face.
	/* panose font type */
	write8(out,2);//Latin text
	write8(out,11);//normal sans serif
	write8(out,6);//medium weight
	write8(out,9);//monospaced
	write8(out,2);//no contrast
	write8(out,2);//no variation
	write8(out,0);//blahhhh
	write8(out,0);//blahhhh
	write8(out,0);//blahhhh
	write8(out,0);//blahhhh
	/*unicode range bits, set all on for now*/
	write32(out,0xFFFFFFFF);
	write32(out,0xFFFFFFFF);
	write32(out,0xFFFFFFFF);
	write32(out,0xFFFFFFFF);
	/*vendor id*/
	writestr(out,"OREN");// blah
	write16(out,0x1C0);//style bits
	write16(out,0x0020);//minmum character
	write16(out,0xFFFF);//last char
	write16(out,ymax);//ideogram ascension
	write16(out,ymin);//ideogram descent
	write16(out,0);//line gap
	write16(out,ymax);//windows basic ascension
	write16(out,-ymin);//windows basic descent
	/*code page range bits, set all on for now*/
	write32(out,0x7FFFFFFF);
	write32(out,0xFFFFFFFF);
	write16(out,UPM/2);//x height
	write16(out,UPM*3/4);//cap height
	write16(out,0xFFFD);//character to use as replacement
	write16(out,0x0020);//character to use as space
	write16(out,1);//max context of ligatures
	unsigned os2len = ftell(out) - os2loc;
	finalizetable(out,os2ent,os2loc,os2len);
	printf(GOYX(3,1)TBCYN"[OS/2]"CLRCOL);

	/*write the post table*/
	unsigned postloc = ftell(out);
	write32(out,0x00030000);//version 3.0
	write32(out,0x00000000);//upright
	write16(out,0x0000);//underline?
	write16(out,0x0002);//thickness?
	write32(out,0x00000001);//font is monospace
	write32(out,0x00000000);//meomory usage unknown
	write32(out,0x00000000);//meomory usage unknown
	write32(out,0x00000000);//meomory usage unknown
	write32(out,0x00000000);//meomory usage unknown
	unsigned postlen = ftell(out) - postloc;
	finalizetable(out,postent,postloc,postlen);
	printf(GOYX(3,61)TBCYN"[post]"CLRCOL);

	/*write the name table*/
	unsigned nameloc = ftell(out);
	FILE *strng = fopen("strng.temp","w+");
	write16(out,0);
	write16(out,12);//number of name records
	write16(out,6+12*12);//offset to start of strings
	char scrap[100];
        strcpy(scrap,fontinfo.name);
        strcat(scrap," Regular");
	writenameent(out,strng,3,1,0x409,1,fontinfo.name);
	writenameent(out,strng,3,1,0x409,2,"Regular");
	writenameent(out,strng,3,1,0x409,3,scrap);
	writenameent(out,strng,3,1,0x409,4,fontinfo.name);
	writenameent(out,strng,3,1,0x409,5,"Version 1.0");
	writenameent(out,strng,3,1,0x409,6,fontinfo.name);
	writenameent(out,strng,1,0,0,1,fontinfo.name);
	writenameent(out,strng,1,0,0,2,"Regular");
	writenameent(out,strng,1,0,0,3,scrap);
	writenameent(out,strng,1,0,0,4,fontinfo.name);
	writenameent(out,strng,1,0,0,5,"Version 1.0");
	writenameent(out,strng,1,0,0,6,fontinfo.name);
	writefile(out,strng);
	unsigned namelen = ftell(out) - nameloc;
	finalizetable(out,nameent,nameloc,namelen);
	printf(GOYX(3,55)"\e[36;1m[name]\e[0m");

	unsigned localoc = ftell(out);
	write32(out,0);
	/* open ttf table files */

	FILE *glyf = fopen("glyf.temp","w+");
	FILE *hmtx = fopen("hmtx.temp","w+");
	FILE *cmap12 = fopen("cmap12.temp","w+");// format 12 table
	int startccode = -1;
	int endccode = -1;
	int startglyfid = 0;
	int maxpoints = 0;
	int maxcontour = 0;
	int glyfid = 0;
	int ngroups = 0;
	int n2groups = 0;//number of groups below FFFF
	int ccode = -1;
        int bl = 12;

	while(glyfid < fontinfo.nchars){
		ccode++;
		while(ccode < 0x20000 && !font[ccode])ccode++;
		if(ccode >= 0x20000)break;
		struct bdfglyph g = *(font[ccode]);
		printf(GOLN(4)"U%05x, %d "TCYN BYEL,ccode,glyfid);
		showbar(fontinfo.nchars,glyfid,30);
		printf(CLRCOL);
		int j,i;
		/* create path map */
		int xmin=20,xmax=0,ymin=16,ymax=0;
		for(i=0;i<=18;i++){
			for(j=0;j<=16;j++){
				pathmap[i+j*19]=bdfpthchk(g,i,j);
				if(pathmap[i+j*19] && pathmap[i+j*19] != 0xF){
					if(i<xmin)xmin=i;
					if(i>xmax)xmax=i;
					if(j<ymin)ymin=j;
					if(j>ymax)ymax=j;
				}
			}
		}
		/* use map to find all paths */
		pathend = 0;
		int n=0;
		for(i=0;i<=18;i++){
			for(j=0;j<=16;j++){
				if(pathmap[i+j*19] && pathmap[i+j*19] != 0xF){
					addpath(i,j);
					n++;
				}
			}
		}
		if(n==0)goto outputloca;
		/* output paths into glyf */
		write16(glyf,n);//number of contours
		write16(glyf,xmin);//xmin
		write16(glyf,bl-ymax);//ymin
		write16(glyf,xmax);//xmax
		write16(glyf,bl-ymin);//ymax
		printf(GOLN(6)"paths: %d %d %d %d %d\n",n,xmin,bl-ymax,xmax,bl-ymin);
		for(i=1;i<pathend;i++){
			if(pathlist[i].start==1)write16(glyf,i-1);
		}
		write16(glyf,pathend-1);
		write16(glyf,0);// zero bytes of code
		for(i=0;i<pathend;i++){
			struct point p = pathlist[i];
			int flags = 7;
			if(p.x == 0)flags ^= 022;
			ei(p.x > 0)flags |= 020;
			if(p.y == 0)flags ^= 044;
			ei(p.y > 0)flags |= 040;
			write8(glyf,flags);
		}
		for(i=0;i<pathend;i++){
			if(pathlist[i].x!=0)write8(glyf,abs(pathlist[i].x));
		}
		for(i=0;i<pathend;i++){
			if(pathlist[i].y!=0)write8(glyf,abs(pathlist[i].y));
		}
		if(pathend > maxpoints)maxpoints = pathend;
		if(n > maxcontour)maxcontour = n;
		outputloca:
		write32(out,ftell(glyf));
		//check if we need to output a character range record
		if(startccode == -1 && ccode != 0){startccode=endccode=ccode;startglyfid=glyfid;}
		if(endccode < ccode-1){
			if(endccode < 0x10000 && ccode > 0x10000)n2groups=ngroups +1;
			write32(cmap12,startccode);
			write32(cmap12,endccode);
			write32(cmap12,startglyfid);
			startccode = endccode = ccode;
			startglyfid = glyfid;
			ngroups++;
		}else endccode=ccode;
		//output hmtx
		if(ccode == 0){
			write16(hmtx,9);
		} else {
			int w = u8chrwidn(ccode);
			write16(hmtx,9*w);
		}
		write16(hmtx,xmin==20?0:xmin);
		printf(GOLN(4)"U%05x, %d",ccode,glyfid);
		glyfid++;
	}
	//final group
	write32(cmap12,startccode);
	write32(cmap12,endccode);
	write32(cmap12,startglyfid);
	ngroups++;

	unsigned localen = ftell(out) - localoc;
	finalizetable(out,locaent,localoc,localen);
	printf(GOYX(3,43)TBCYN"[loca]"CLRCOL);

	unsigned hmtxloc = ftell(out);
	writefile(out,hmtx);
	unsigned hmtxlen = ftell(out) - hmtxloc;
	finalizetable(out,hmtxent,hmtxloc,hmtxlen);
	printf(GOYX(3,37)TBCYN"[hmtx]"CLRCOL);

	unsigned cmaploc = ftell(out);
	write16(out,0);
	write16(out,2);//1 subtables
	write16(out,3);//platform 3 windows
	write16(out,1);//code 1 unicode BMP
	write32(out,20);//offset
	write16(out,3);//platform 3 windows
	write16(out,10);//code 10 unicode
	write32(out,0);//offset
	write16(out,4);//subtable format 4
	unsigned nranges = n2groups + 1;
	write16(out,nranges*8 + 16);//length
	write16(out,0);//language (not used)
	write16(out,nranges*2);
	unsigned searchrange=2;
	unsigned selector = 0;
	while(searchrange<=nranges)searchrange*=2,selector++;
	write16(out,searchrange);
	write16(out,selector);
	write16(out,2*nranges - searchrange);
	int i;
	for(i=0;i<n2groups;i++){
		goloc(cmap12,12*i+4);
		write16(out,read32(cmap12));
	}
	write16(out,0xFFFF);
	write16(out,0);
	for(i=0;i<n2groups;i++){
		goloc(cmap12,12*i);
		write16(out,read32(cmap12));
	}
	write16(out,0xFFFF);
	for(i=0;i<n2groups;i++){
		goloc(cmap12,12*i);
		unsigned short x = read32(cmap12);
	        read32(cmap12);
	        x = read32(cmap12) - x;
		write16(out,x);
	}
	write16(out,1);
	for(i=0;i<n2groups;i++){
		write16(out,0);
	}
	write16(out,0);
	unsigned cmap12loc = ftell(out);
	write16(out,12);//subtable format 12
	write16(out,0);//reserved 0
	write32(out,ngroups*12 + 16);//length
	write32(out,0);//language (not used)
	write32(out,ngroups);//number of groups
	writefile(out,cmap12);
	goloc(out,cmaploc+16);
	write32(out,cmap12loc-cmaploc);
	ffastfw(out);
	unsigned cmaplen = ftell(out) - cmaploc;
	finalizetable(out,cmapent,cmaploc,cmaplen);
	printf(GOYX(3,7)TBCYN"[cmap]"CLRCOL);

	unsigned glyfloc = ftell(out);
	writefile(out,glyf);
	unsigned glyflen = ftell(out) - glyfloc;
	finalizetable(out,glyfent,glyfloc,glyflen);
	printf(GOYX(3,19)TBCYN"[glyf]"CLRCOL);

	unsigned maxploc = ftell(out);
	write32(out,0x00010000);
	write16(out,glyfid);//number of glyphs
	write16(out,maxpoints);
	write16(out,maxcontour);
	write16(out,maxpoints);
	write16(out,maxcontour);
	write16(out,1);//program maxima
	write16(out,0);
	write16(out,0);
	write16(out,0);
	write16(out,0);
	write16(out,0);
	write16(out,0);
	write16(out,0);
	write16(out,0);
	unsigned maxplen = ftell(out) - maxploc;
	finalizetable(out,maxpent,maxploc,maxplen);
	printf(GOYX(3,49)TBCYN"[maxp]"CLRCOL);

	printf(GOYX(7,1)"...computing final checksum...");
	uint32_t sum = 0;
	unsigned len = ftell(out);
	goloc(out,0);
	for(i=0;i<len;i++)sum += read32(out);
	goloc(out,headloc + 8);
	write32(out,sum);
	printf(GOYX(3,25)TBCYN"[head]"CLRCOL GOLN(8)"Finished!\n");

	return 0;
}

struct point p0;
void addpath(int x,int y){
	int dir;
	int i = pathend;
	char map = pathmap[x+y*19];
	printf("\e[5;1H\e[2Kstart at %d,%d:",x,y);
	if(i==0){
		pathlist[i] = (struct point){x,12-y,1};
		p0 = (struct point){x,12-y,1};
	}else{
		pathlist[i] = (struct point){x-p0.x,12-y-p0.y,1};
		p0 = (struct point){x,12-y,1};
	}
	if(map == 8){dir = 'R';pathmap[x+y*19]=0;}
	if(map == 7){dir = 'D';pathmap[x+y*19]=0;}
	i++;
	pathlist[i]=(struct point){0,0,0};
	nextpoint:;
	putchar(dir);
	fflush(stdout);
	int olddir = dir;
	if(dir == 'R'){
		x++;
		pathlist[i].x++;
		char map = pathmap[x+y*19];
		if(map == 4){dir = 'D';pathmap[x+y*19]=0;}
		ei(map == 6){dir = 'D';pathmap[x+y*19]=2;}
		ei(map == 12){dir = 'R';pathmap[x+y*19]=0;}
		ei(map == 14){dir = 'U';pathmap[x+y*19]=0;}
		else goto endof;
	}ei(dir == 'D'){
		y++;
		pathlist[i].y--;
		char map = pathmap[x+y*19];
		if(map == 1){dir = 'L';pathmap[x+y*19]=0;}
		ei(map == 5){dir = 'D';pathmap[x+y*19]=0;}
		ei(map == 9){dir = 'L';pathmap[x+y*19]=8;}
		ei(map == 13){dir = 'R';pathmap[x+y*19]=0;}
		else goto endof;
	}ei(dir == 'L'){
		x--;
		pathlist[i].x--;
		char map = pathmap[x+y*19];
		if(map == 2){dir = 'U';pathmap[x+y*19]=0;}
		ei(map == 3){dir = 'L';pathmap[x+y*19]=0;}
		ei(map == 6){dir = 'U';pathmap[x+y*19]=4;}
		ei(map == 7){dir = 'D';pathmap[x+y*19]=0;}
		else goto endof;
	}ei(dir == 'U'){
		y--;
		pathlist[i].y++;
		char map = pathmap[x+y*19];
		if(map == 8){dir = 'R';pathmap[x+y*19]=0;}
		ei(map == 9){dir = 'R';pathmap[x+y*19]=1;}
		ei(map == 10){dir = 'U';pathmap[x+y*19]=0;}
		ei(map == 11){dir = 'L';pathmap[x+y*19]=0;}
		else goto endof;
	}
	if(dir != olddir){
		p0.x += pathlist[i].x;
		p0.y += pathlist[i].y;
		i++;
		pathlist[i]=(struct point){0,0,0};
	}
	goto nextpoint;
	endof:;
	printf(" end at %d,%d\n",p0.x,p0.y);
	pathend = i; // the last segment is not included.
}


int bdfpixchk(struct bdfglyph g,int x,int y){
	if(x<0||y<0||x>17||y>15)return 0;
	return!!(g.bitmap[y]&(0x20000>>x));
}

int bdfpthchk(struct bdfglyph g,int x,int y){
	return	bdfpixchk(g,x-1,y-1) +
		2*bdfpixchk(g,x,y-1) +
		4*bdfpixchk(g,x-1,y) +
		8*bdfpixchk(g,x,y);
}
