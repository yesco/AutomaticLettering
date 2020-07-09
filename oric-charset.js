//
// This file has the following purposes:
// - provide the ORIC-ATMOS font
// - generate an SVG SYMBOL for each letter
// - generate a BDF-font that can be compiled to a TTF-font

// Oric font coded as hex, one character is 16 hex-chars, 2 per pixel-line
// Starts at ' ' = 32, has 96 chars
ORIC_FONT_HEX =
  `00000000000000000808080808000800141414000000000014143e143e141400081e281c0a3c08003032040810260600102828102a241a00080808000000000008102020201008000804020202040800082a1c081c2a08000008083e0808000000000000000808100000003e00000000000000000004000000020408102000001c22262a32221c000818080808081c001c22020408103e003e02040c02221c00040c14243e0404003e203c0202221c000c10203c22221c003e020408101010001c22221c22221c001c22221e0204180000000800000800000000080000080810040810201008040000003e003e00000010080402040810001c220408080008001c222a2e2c201e00081422223e2222003c22223c22223c001c22202020221c003c22222222223c003e20203c20203e003e20203c202020001e20202026221e002222223e222222001c08080808081c000202020202221c0022242830282422002020202020203e0022362a2a222222002222322a262222001c22222222221c003c22223c202020001c2222222a241a003c22223c282422001c22201c02221c003e080808080808002222222222221c0022222222221408002222222a2a362200222214081422220022221408080808003e02040810203e001e10101010101e0000201008040200003c04040404043c0008142a08080808000e1010103c103e000c122d29292d120c00001c021e221e0020203c2222223c0000001e2020201e0002021e2222221e0000001c223e201e000c12103c1010100000001c22221e021c20203c22222222000800180808081c0004000c040404241820202224382422001808080808081c000000362a2a2a220000003c222222220000001c2222221c0000003c22223c202000001e22221e020200002e302020200000001e201c023c0010103c1010120c000000222222261a000000222222140800000022222a2a3600000022140814220000002222221e021c00003e0408103e000e18183018180e000808080808080808380c0c060c0c38002a152a152a152a153f3f3f3f3f3f3f3f`;

// Starts at ' ' = 32, has 96 chars
ORIC_FONT = new Uint8Array(ORIC_FONT_HEX.length/2);

function ORIC_init_font() {
  for(let i=0; i<ORIC_FONT.length; i++) {
    ORIC_FONT[i] = parseInt(ORIC_FONT_HEX.substr(i*2, 2), 16);
  }
}
ORIC_init_font();

function ORIC_char2offset(c) {
  if (typeof c === 'string')
    c = c.charCodeAt(0);
  if (c < 32 || c > 127)
    throw 'chardef: charcode no good: ' + c;
  return (c - 32)*8;
}

// SVG stuff
function bits2svg(sixbits, y=0) {
  let i = 0;
  let h = '';
  while(sixbits) {
    if (sixbits & 1) {
      // TODO: optimize adjacent bits
      h += `<rect x='${5-i}' y='${y}' width='1' height='1' />`;
    }
    sixbits = sixbits >> 1;
    i++;
  }
  return h+'\n';
}

function char2svg(c) {
  let a = ORIC_char2offset(c);
  let h = '';
  for(let i=0; i<8; i++) {
    h += bits2svg(ORIC_FONT[a+i], i);
  }
  return `<symbol id='char-${c}'>${h}</symbol>`;
}

function svg(h) {
  return `<svg id='bar' viewBox="0 0 6 8" xmlns="http://www.w3.org/2000/svg">${h}</svg>`;
}

// TODO: move to oric.html
function ORIC_font_peek(o) {
  return ORIC_FONT[o];
}
function ORIC_font_poke(o, v) {
  // TODO: in screen: catch that this character is mapped!
  ORIC_FONT[o] = v;
  // and do an update of the svg symbol!
  let c = Math.floor(o / 8);
  // magically this updates the symbol and the screen!
  dom(`char-${c}`).innerHTML = char2svg(c);
}

// adds all symbols as '#char-NUM' to the  document
function ORIC_append_symbols() {
  let h = [];
  for(let c=32; c<128; c++) {
    h.push(char2svg(c));
  }

  // add svg symbols at end
  document.body.insertAdjacentHTML(
    'beforeEnd',
    '<span style="display:none;">'+
      svg(h.join(''))+
      '</span>');
}

// 'A' or 65 => svg use
function ORIC_use_char(c) {
  if (typeof c === 'string')
    c = c.charCodeAt(0);

  return `<svg viewBox="0 0 6 8" xmlns="http://www.w3.org/2000/svg" height='20px'><use x="0" y='0' href='#char-${c}'/></svg>`;
}

let rand = 0; //Math.floor(Math.random()*16);

function ORIC_char_BDF(c, optHex, w=6, h=8) {
  if (typeof c === 'string')
    c = c.charCodeAt(0);
    
  let hex = optHex ||
      ORIC_FONT_HEX.substr( (c-32)*2*8, 2*8).toUpperCase();
  // TODO: STARTCHAR importace?
  return (
`STARTCHAR
ENCODING ${c+rand}
SWIDTH 200 0
DWIDTH 8 0
BBX ${w} ${h} 0 0
BITMAP
${hex.match(/(..)/g, '$1').join('\n')}
ENDCHAR`);
}

function ORIC_generate_BDF(alt) {
  let out = [];

  // generate ALT blockfont
  if (alt) {
    for(let c=32; c<96; c++) {
      let hex = '';
      function add(l, r, times) {
	let bits = (l?0x38:0) | (r?0x7:0);
	hex += bits.toString(16).padStart(2, '0').repeat(times);
	  //console.log(bits.toString(2).padStart(8,'0'));
      }
      //console.log('----------- ' + c);
      add(c &  1, c &  2, 3);
      add(c &  4, c &  8, 2);
      add(c & 16, c & 64, 3);
      //console.log('====== ' + hex);
      let bdf = ORIC_char_BDF(c, hex);
      //console.log(bdf);
      //console.log();
      out.push(bdf);
    }
  } else {
    // dump the ORIC FONT
    for(let c=32; c<128; c++) {
      out.push(ORIC_char_BDF(c));
    }
  }

  // extra spaces
  // (32 is not fixed width in browser!)
  out.push(
    ORIC_char_BDF(128, '0000000000000000', 6, 8));
  out.push(
    ORIC_char_BDF(128 + 32, '0000000000000000', 6, 8));

  // generate 6x1 pixel cells!
  if (!alt) {
    let poffset = 128+64; // TODO: check unicode?
    for(let m=0; m<64; m++) {
      out.push(
	ORIC_char_BDF(
	  poffset + m,
	  m.toString(16).padStart(2, '0').toUpperCase().repeat(1),
	  6, 1));
    }
  }

  // TODO: add good hexmaps that people
  // often redefine? | + corners etc

  // prelude
  console.log(
`STARTFONT 2.1
FONT ORIC-ATMOS${alt?'-ALT':''}
SIZE 16 150 150
COMMENT x 16 0 -8 ... 16 fixed can't do smaller
FONTBOUNDINGBOX 6 16 0 -4
STARTPROPERTIES 3
PIXEL_SIZE 16
FONT_ASCENT 8
FONT_DESCENT 4
ENDPROPERTIES
CHARS ${out.length}`);

  out.forEach(bdf=>console.log(bdf));

  // postlude
  console.log(`ENDFONT`);;
}

// https://stackoverflow.com/questions/9005580/how-to-check-if-the-font-has-a-symbol
// This function could be used to see
// if there is a predef font (by name?)
// as a defined hexcode? At least:
// we should know!
//
// => charcode or undefined
function ORIC_font_has(hex) {
  throw 'Not implemented yet!';
}

// from nodejs: generate
if (typeof require !== 'undefined') {
  ORIC_generate_BDF(process.argv[2] === 'alt');
}
