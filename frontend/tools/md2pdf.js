const fs = require('fs');
const path = require('path');

// Simple markdown -> plain text (very light): remove headings and markdown syntax
function mdToPlain(md) {
  return md
    .replace(/\r\n/g, '\n')
    .replace(/\n {0,3}# +/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{2,}/g, '\n\n')
    .trim();
}

function wrapText(text, width) {
  const words = text.split(/(\s+)/);
  const lines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if ((cur + w).length > width && cur.trim().length>0) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur += w;
    }
  }
  if (cur.trim().length) lines.push(cur.trim());
  return lines;
}

function escapePdfText(s) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

const mdPath = path.join(__dirname, '..', 'docs', 'projet-rapport.md');
const outPdf = path.join(__dirname, '..', 'docs', 'projet-rapport.pdf');
const outB64 = outPdf + '.b64';

if (!fs.existsSync(mdPath)) {
  console.error('Markdown file not found:', mdPath);
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf8');
const plain = mdToPlain(md);
const paras = plain.split('\n\n');

const pageWidth = 595; // A4 points
const pageHeight = 842;
const marginLeft = 50;
let cursorY = 790;
const lineHeight = 14;
const maxChars = 95; // approx wrap

let lines = [];
paras.forEach(p => {
  const wrapped = wrapText(p.replace(/\n/g, ' '), maxChars);
  wrapped.forEach(l => lines.push(l));
  lines.push('');
});

// Build content stream
let content = 'BT\n/F1 12 Tf\n' + marginLeft + ' ' + cursorY + ' Td\n';
for (let i = 0; i < lines.length; i++) {
  const l = escapePdfText(lines[i] || '');
  content += '(' + l + ') Tj\n';
  if (i !== lines.length -1) content += '0 -' + lineHeight + ' Td\n';
}
content += 'ET\n';

// PDF objects
const objs = [];
objs.push('%PDF-1.4\n%âãÏÓ\n');

objs.push({id:1, str: '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'});
objs.push({id:2, str: '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'});
objs.push({id:3, str: '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageWidth + ' ' + pageHeight + '] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'});
objs.push({id:4, str: '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'});

const contentBytes = Buffer.from(content, 'utf8');
const obj5 = '5 0 obj\n<< /Length ' + contentBytes.length + ' >>\nstream\n' + content + 'endstream\nendobj\n';
objs.push({id:5, str: obj5});

// assemble with offsets
let pdf = '';
objs.forEach(o => {
  if (typeof o === 'string') pdf += o;
  else pdf += o.str;
});

// compute xref
const parts = pdf.split('');
let offsets = [];
let cursor = 0;
const pieces = [];
// rebuild sequentially to capture offsets
let assembled = '';
assembled += '%PDF-1.4\n%âãÏÓ\n';
let off = Buffer.byteLength(assembled, 'utf8');
offsets.push(off); // dummy for object 0 (we'll replace later)
for (let i=0;i<objs.length;i++){
  const o = objs[i];
  if (typeof o === 'string') {
    // ignore
  }
}
// Better approach: create array of object strings in order 1..5
const objStrings = [];
objStrings[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
objStrings[2] = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
objStrings[3] = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageWidth + ' ' + pageHeight + '] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';
objStrings[4] = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
objStrings[5] = obj5;

let output = '%PDF-1.4\n%âãÏÓ\n';
const offsetsList = [0];
for (let id = 1; id <= 5; id++) {
  offsetsList[id] = Buffer.byteLength(output, 'utf8');
  output += objStrings[id];
}

const xrefStart = Buffer.byteLength(output, 'utf8');
let xref = 'xref\n0 ' + (5+1) + '\n';
xref += '0000000000 65535 f\n';
for (let id=1; id<=5; id++){
  const offStr = String(offsetsList[id]).padStart(10, '0');
  xref += offStr + ' 00000 n\n';
}

const trailer = 'trailer\n<< /Size ' + (5+1) + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF\n';

const finalPdf = output + xref + trailer;

fs.writeFileSync(outPdf, finalPdf, 'binary');

// write base64
const b64 = Buffer.from(finalPdf, 'binary').toString('base64');
fs.writeFileSync(outB64, b64, 'utf8');
console.log('WROTE', outPdf, 'and', outB64);
