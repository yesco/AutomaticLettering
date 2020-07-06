#include "stdint.h"
#include "stdio.h"
#include "u8.h"

int win1252[] = {0x20ac,0x81,0x201A,0x192,0x201E,0x2026,0x2020,0x2021,0x2C6,0x2030,0x160,0x2039,0x152,0x8D,0x17D,0x8F,
		0x90,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x2DC,0x2122,0x161,0x203A,0x153,0x9D,0x17E,0x178};

char *u8chtostr(unsigned ch){
	static char buf[5];
	buf[4]=0;
	if(ch<0200){
		buf[3]=ch;
		return buf+3;
	}
	if(ch<04000){
		buf[3]=(ch&077) + 0200;
		buf[2]=(ch/0100) + 0300;
		return buf+2;
	}
	if(ch<0200000){
		buf[3]=(ch&077) + 0200;
		buf[2]=(ch/0100&077) + 0200;
		buf[1]=(ch/010000) + 0340;
		return buf+1;
	}
	buf[3]=(ch&077) + 0200;
	buf[2]=(ch/0100&077) + 0200;
	buf[1]=(ch/010000&077) + 0200;
	buf[0]=(ch/01000000) + 0360;
	return buf;
}

int u8fputch(FILE *f, unsigned ch){
	return fputs(u8chtostr(ch),f);
}

int u8putch(unsigned ch){
	return fputs(u8chtostr(ch),stdout);
}

int u8fscanch(FILE *f){
	int c = fgetc(f);
	if(c == EOF)return EOF;
	if(c < 0200){return c;}
	if(c < 0240){ // invalid start byte. fallback to windows1252
		return win1252[c-128];
	}
	if(c < 0300){ // invalid start byte. fallback to latin-1
		return c;
	}
	if(c < 0340){ // start byte needing 1 continuation byte
		int c1 = fgetc(f);
		if(c1 == EOF)return c;
		if(c1<0200||c1>=0300){//invalid continuation byte
			ungetc(c1,f);
			return c;
		}
		return (c&077)*0100 + (c1&077);
	}
	if(c < 0360){ // start byte needing 2 continuation bytes
		int c1 = fgetc(f);
		if(c1<0200||c1>=0300){//invalid continuation byte
			ungetc(c1,f);
			return c;
		}
		int c2 = fgetc(f);
		if(c2<0200||c2>=0300){//invalid continuation byte
			ungetc(c2,f);
			ungetc(c1,f);
			return c;
		}
		return (c-0340)*010000 + (c1&077)*0100 + (c2&077);
	}
	if(c < 0370){ // start byte needing 3 continuation bytes
		int c1 = fgetc(f);
		if(c1<0200||c1>=0300){//invalid continuation byte
			ungetc(c1,f);
			return c;
		}
		int c2 = fgetc(f);
		if(c2<0200||c2>=0300){//invalid continuation byte
			ungetc(c2,f);
			ungetc(c1,f);
			return c;
		}
		int c3 = fgetc(f);
		if(c3<0200||c3>=0300){//invalid continuation byte
			ungetc(c3,f);
			ungetc(c2,f);
			ungetc(c1,f);
			return c;
		}
		return (c-0360)*01000000 + (c1&077)*010000 + (c2&077)*0100 + (c3&077);
	}
	//start bytes for supernal plane, fall back to latin 1
	return c;
}

int u8sscanch(const char *s,const char **end){
	if(*s < 0200){
		if(end)*end=s+1;
		return *s;
	}
	if(*s < 0240){ // invalid start byte. fallback to windows1252
		if(end)*end=s+1;
		return win1252[*s-128];
	}
	if(*s < 0300){ // invalid start byte. fallback to latin-1
		if(end)*end=s+1;
		return *s;
	}
	if(*s < 0340){ // start byte needing 1 continuation byte
		if(s[1]<0200||s[1]>=0300){//invalid continuation byte
			if(end)*end=s+1;
			return *s;
		}
		if(end)*end=s+2;
		return (*s&077)*0100 + (*(s+1)&077);
	}
	if(*s < 0360){ // start byte needing 2 continuation bytes
		if(s[1]<0200||s[1]>=0300){//invalid continuation byte
			if(end)*end=s+1;
			return *s;
		}
		if(s[2]<0200||s[2]>=0300){//invalid continuation byte
			if(end)*end=s+1;
			return *s;
		}
		if(end)*end=s+3;
		return (*s-0340)*010000 + (s[1]&077)*0100 + (s[2]&077);
	}
	if(*s < 0370){ // start byte needing 3 continuation bytes
		if(s[1]<0200||s[1]>=0300){//invalid continuation byte
			if(end)*end=s+1;
			return *s;
		}
		if(s[2]<0200||s[2]>=0300){//invalid continuation byte
			if(end)*end=s+1;
			return *s;
		}
		if(s[3]<0200||s[3]>=0300){//invalid continuation byte
			if(end)*end=s+1;
			return *s;
		}
		if(end)*end=s+4;
		return (*s-0360)*01000000 + (s[1]&077)*010000 + (s[2]&077)*0100 + (s[3]&077);
	}
	//start bytes for supernal plane, fall back to latin 1
	if(end)*end=s+1;
	return *s;
}

int u8scanch(void){
	return u8fscanch(stdin);
}

int u8chrwidn(unsigned ch){
	int x = u8chrwid(ch);
	if(x == 0)return 1;
	return x;
}

int u8chrwid(unsigned ch){
#include "u8widdat.h"
return 1;
}

