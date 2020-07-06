
/*

STARTFONT 2.1
FONT neoletters
SIZE 12 75 75
FONTBOUNDINGBOX 18 16 0 -4
STARTPROPERTIES 3
PIXEL_SIZE 16
FONT_ASCENT 12
FONT_DESCENT 4
ENDPROPERTIES
CHARS 21576


*/


#define MAX_FONT_PROPS 40

struct bdfglyph {
	char name[16];
	int encoding;
	int dwidth;
	int bbx[4];
	unsigned bitmap[16];
};

struct bdfinfo {
	char name[64];
	int dpi;
	int size;
	int bbx[4];
	int nprops;
	char **prop_lines;
	int nchars;
};


struct bdfglyph *make_blank_char(unsigned gi);
struct bdfglyph *copy_char(unsigned gi, struct bdfglyph *gc);
void calc_bbx(struct bdfglyph *g);
void load_font(const char * filename, struct bdfglyph **font, struct bdfinfo *info, void(*status_callback)(struct bdfglyph *g, int cur, int tot));
void save_font(const char * filename, struct bdfglyph **font, struct bdfinfo *info, void(*status_callback)(struct bdfglyph *g, int cur, int tot));
void outputasbitmap(struct bdfglyph *g,int y, int x);
unsigned leftshft(unsigned x,int i);

