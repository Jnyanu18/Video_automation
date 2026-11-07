'use strict';
// Minimal ISO-BMFF reader: confirms the file is MP4/MOV with a video track and reads the duration from moov/mvhd.
const fs = require('fs');

const type4 = (buf, o) => buf.toString('latin1', o, o + 4);

async function readAt(fh, pos, len) {
  const buf = Buffer.alloc(len);
  const { bytesRead } = await fh.read(buf, 0, len, pos);
  return buf.subarray(0, bytesRead);
}

function findBox(buf, wanted, start, end) {
  let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p);
    const t = type4(buf, p + 4);
    let hdr = 8;
    if (size === 1) {
      if (p + 16 > end) return null;
      size = Number(buf.readBigUInt64BE(p + 8));
      hdr = 16;
    } else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) return null;
    if (t === wanted) return { start: p + hdr, end: p + size };
    p += size;
  }
  return null;
}

async function probeMp4(file) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const { size: fileSize } = await fh.stat();
    const head = await readAt(fh, 0, 16);
    if (head.length < 12 || type4(head, 4) !== 'ftyp') return { ok: false, error: 'NOT_MP4_OR_MOV' };
    const brand = type4(head, 8);
    let pos = 0;
    let moov = null;
    while (pos + 8 <= fileSize) {
      const h = await readAt(fh, pos, 16);
      if (h.length < 8) break;
      let size = h.readUInt32BE(0);
      const t = type4(h, 4);
      let hdr = 8;
      if (size === 1) {
        if (h.length < 16) break;
        size = Number(h.readBigUInt64BE(8));
        hdr = 16;
      } else if (size === 0) size = fileSize - pos;
      if (size < hdr || pos + size > fileSize) return { ok: false, error: 'MP4_TRUNCATED_OR_CORRUPT' };
      if (t === 'moov') {
        if (size > 32 * 1048576) return { ok: false, error: 'MP4_METADATA_TOO_LARGE' };
        moov = await readAt(fh, pos + hdr, size - hdr);
        break;
      }
      pos += size;
    }
    if (!moov) return { ok: false, error: 'MP4_NO_MOOV' };
    const mvhd = findBox(moov, 'mvhd', 0, moov.length);
    if (!mvhd || mvhd.end - mvhd.start < 20) return { ok: false, error: 'MP4_NO_DURATION' };
    const v = moov.readUInt8(mvhd.start);
    let timescale;
    let duration;
    if (v === 1) {
      timescale = moov.readUInt32BE(mvhd.start + 20);
      duration = Number(moov.readBigUInt64BE(mvhd.start + 24));
    } else {
      timescale = moov.readUInt32BE(mvhd.start + 12);
      duration = moov.readUInt32BE(mvhd.start + 16);
    }
    if (!timescale || !duration) return { ok: false, error: 'MP4_NO_DURATION' };
    // Look for a video track handler.
    let hasVideo = false;
    let p = 0;
    while (!hasVideo) {
      const i = moov.indexOf('hdlr', p, 'latin1');
      if (i < 0) break;
      if (moov.toString('latin1', i + 12, i + 20).indexOf('vide') !== -1) hasVideo = true;
      p = i + 4;
    }
    if (!hasVideo) return { ok: false, error: 'MP4_NO_VIDEO_TRACK' };
    return { ok: true, brand, mimeType: brand === 'qt  ' ? 'video/quicktime' : 'video/mp4', durationSeconds: Math.round((duration / timescale) * 100) / 100 };
  } finally {
    await fh.close();
  }
}

// Builds a tiny structurally valid MP4 (no real media) for tests.
function buildTestMp4(seconds, opts) {
  const o = opts || {};
  const box = (t, ...parts) => {
    const body = Buffer.concat(parts);
    const h = Buffer.alloc(8);
    h.writeUInt32BE(body.length + 8, 0);
    h.write(t, 4, 'latin1');
    return Buffer.concat([h, body]);
  };
  const ts = 1000;
  const mvhdBody = Buffer.alloc(100);
  mvhdBody.writeUInt32BE(ts, 12);
  mvhdBody.writeUInt32BE(Math.round(seconds * ts), 16);
  const hdlrBody = Buffer.alloc(24);
  hdlrBody.write(o.noVideo ? 'soun' : 'vide', 8, 'latin1');
  const ftyp = box('ftyp', Buffer.from(o.brand || 'isom', 'latin1'), Buffer.alloc(4), Buffer.from('isom', 'latin1'));
  const moov = box('moov', box('mvhd', mvhdBody), box('trak', box('mdia', box('hdlr', hdlrBody))));
  const mdat = box('mdat', Buffer.alloc(o.padBytes || 64, 7));
  return Buffer.concat(o.moovLast ? [ftyp, mdat, moov] : [ftyp, moov, mdat]);
}

module.exports = { probeMp4, buildTestMp4 };
