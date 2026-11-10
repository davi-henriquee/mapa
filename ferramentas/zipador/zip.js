/* ZIP clássico (STORE): fotos já comprimidas não precisam de Deflate.
   UTF-8, CRC-32 e diretório central; sem bibliotecas ou conexão externa. */
(function (root) {
  'use strict';
  const encoder = new TextEncoder();
  const table = Uint32Array.from({ length: 256 }, (_, n) => {
    for (let k = 0; k < 8; k++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function safeName(value, fallback = '') {
    return String(value).normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '-').trim().replace(/[. ]+$/g, '').slice(0, 120).replace(/[. ]+$/g, '') || fallback;
  }
  function archiveName(number, description) {
    const code = safeName(number, 'imovel');
    const detail = safeName(description);
    const name = code + (detail ? '_' + detail : '');
    return (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? '_' : '') + name + '.zip';
  }
  async function makeZip(files, onProgress = () => {}, checkCancelled = () => {}) {
    if (files.length > 65535) throw new Error('Há arquivos demais para este ZIP.');
    const parts = [], central = [];
    let offset = 0, directorySize = 0;
    const now = new Date();
    const date = ((Math.max(1980, Math.min(2107, now.getFullYear())) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    for (let i = 0; i < files.length; i++) {
      checkCancelled();
      const file = files[i], name = encoder.encode(file.name);
      const bytes = new Uint8Array(await file.blob.arrayBuffer());
      const crc = crc32(bytes);
      if (name.length > 65535 || bytes.length + offset > 0xffffffff) throw new Error('O ZIP excede o limite de 4 GB. Use menos fotos.');
      const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
      const entry = new Uint8Array(46 + name.length), c = new DataView(entry.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
      c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true); entry.set(name, 46);
      parts.push(header, file.blob); central.push(entry); directorySize += entry.length; offset += header.length + bytes.length;
      onProgress(i + 1, files.length);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    checkCancelled();
    if (offset + directorySize > 0xffffffff) throw new Error('O ZIP excede o limite de 4 GB.');
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }
  root.MapaZip = { makeZip, archiveName, safeName, crc32 };
})(globalThis);
