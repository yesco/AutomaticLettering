/* 6502.js heaviy edited by jsk@yesco.org

   File originally from:
   - https://github.com/6502/js6502

   This file contains:
   - the assembler,
   - and disassembler.
   (the 6502.js was split into two files)

  /Jonas

*/

/****************************************************************************
******************************************************************************
**                                                                          **
**  Copyright (c) 2012 by Andrea Griffini                                   **
**                                                                          **
**  Permission is hereby granted, free of charge, to any person obtaining   **
**  a copy of this software and associated documentation files (the         **
**  "Software"), to deal in the Software without restriction, including     **
**  without limitation the rights to use, copy, modify, merge, publish,     **
**  distribute, sublicense, and/or sell copies of the Software, and to      **
**  permit persons to whom the Software is furnished to do so, subject to   **
**  the following conditions:                                               **
**                                                                          **
**  The above copyright notice and this permission notice shall be          **
**  included in all copies or substantial portions of the Software.         **
**                                                                          **
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,         **
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF      **
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND                   **
**  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE  **
**  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION  **
**  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION   **
**  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.         **
**                                                                          **
******************************************************************************
 ****************************************************************************/

// Utility ////////////////////////////////////////////////////////////

function hex(n,x) {
  var r = "";
  for (var i=0; i<n; i++) {
    r = "0123456789ABCDEF"[x & 15] + r;
    x >>= 4;
  }
  return r;
}

function parseHex(x) {
  var r = 0;
  for (var i=0; i<x.length; i++)
    r = (r << 4) + "0123456789ABCDEF".indexOf(x[i].toUpperCase());
  return r;
}

function parseBin(x)
{
  var r = 0;
  for (var i=0; i<x.length; i++)
    r = (r << 1) + (x[i]=="1");
  return r;
}

// Disassembling addressing modes

function s_imm(ip)  { return [1, "#$" + hex(2,m[ip])]; }
function s_zpg(ip)  { return [1, "$" + hex(2,m[ip])]; }
function s_zpx(ip)  { return [1, "$" + hex(2,m[ip]) + ",x"]; }
function s_zpy(ip)  { return [1, "$" + hex(2,m[ip]) + ",y"]; }
function s_abs(ip)  { return [2, "$" + hex(4,m[ip]+m[(ip+1)&65535]*256)]; }
function s_abx(ip)  { return [2, "$" + hex(4,m[ip]+m[(ip+1)&65535]*256) + ",x"]; }
function s_aby(ip)  { return [2, "$" + hex(4,m[ip]+m[(ip+1)&65535]*256) + ",y"]; }
function s_iix(ip)  { return [1, "($" + hex(2,m[ip]) + ",x)"]; }
function s_iiy(ip)  { return [1, "($" + hex(2,m[ip]) + "),y"]; }
function s_rel(ip)  { var delta = m[ip]; if (delta>=128) delta-=256; return [1, "$" + hex(4,ip+1+delta)]; }
function s_adr(ip)  { return [2, "$" + hex(4,m[ip]+m[ip+1]*256)]; }
function s_ind(ip)  { return [2, "($" + hex(4,m[ip]+m[ip+1]*256) + ")"]; }
function s_acc(ip)  { return [0, "a"]; }

function disassemble(ip)
{
    var op = opcodes[m[ip]];
    if (op[0] == "___")
    {
        return [0, hex(4, ip) + ": " + hex(2, m[ip]) + "       ???"];
    }
    else if (op[1] == "___")
    {
        return [0, hex(4, ip) + ": " + hex(2, m[ip]) + "       " + op[0]];
    }
    else
    {
        var ds = window["s_" + op[1]]((ip+1)&65535);
        return [ds[0], (hex(4, ip) + ": " + hex(2, m[ip]) + " " +
                        (ds[0] > 0 ? hex(2, m[(ip+1)&65535]) : "  ") + " " +
                        (ds[0] > 1 ? hex(2, m[(ip+2)&65535]) : "  ") + " " +
                        op[0] + " " + ds[1])];
    }
}

