/*******************************************************************************

    AdNauseam - Fight back against advertising surveillance.
    Copyright (C) 2014-2024 Daniel C. Howe

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/dhowe/AdNauseam
*/

'use strict';

/******************************************************************************/
// YaMD5 - Yet another MD5 hasher (Raymond Hill, MIT License)
// Inlined here to avoid cross-directory import issues with the MV3 build.

const md5cycle = function(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a += (b & c | ~b & d) + k[0] - 680876936 | 0;
    a  = (a << 7 | a >>> 25) + b | 0;
    d += (a & b | ~a & c) + k[1] - 389564586 | 0;
    d  = (d << 12 | d >>> 20) + a | 0;
    c += (d & a | ~d & b) + k[2] + 606105819 | 0;
    c  = (c << 17 | c >>> 15) + d | 0;
    b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
    b  = (b << 22 | b >>> 10) + c | 0;
    a += (b & c | ~b & d) + k[4] - 176418897 | 0;
    a  = (a << 7 | a >>> 25) + b | 0;
    d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
    d  = (d << 12 | d >>> 20) + a | 0;
    c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
    c  = (c << 17 | c >>> 15) + d | 0;
    b += (c & d | ~c & a) + k[7] - 45705983 | 0;
    b  = (b << 22 | b >>> 10) + c | 0;
    a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
    a  = (a << 7 | a >>> 25) + b | 0;
    d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
    d  = (d << 12 | d >>> 20) + a | 0;
    c += (d & a | ~d & b) + k[10] - 42063 | 0;
    c  = (c << 17 | c >>> 15) + d | 0;
    b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
    b  = (b << 22 | b >>> 10) + c | 0;
    a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
    a  = (a << 7 | a >>> 25) + b | 0;
    d += (a & b | ~a & c) + k[13] - 40341101 | 0;
    d  = (d << 12 | d >>> 20) + a | 0;
    c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
    c  = (c << 17 | c >>> 15) + d | 0;
    b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
    b  = (b << 22 | b >>> 10) + c | 0;
    a += (b & d | c & ~d) + k[1] - 165796510 | 0;
    a  = (a << 5 | a >>> 27) + b | 0;
    d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
    d  = (d << 9 | d >>> 23) + a | 0;
    c += (d & b | a & ~b) + k[11] + 643717713 | 0;
    c  = (c << 14 | c >>> 18) + d | 0;
    b += (c & a | d & ~a) + k[0] - 373897302 | 0;
    b  = (b << 20 | b >>> 12) + c | 0;
    a += (b & d | c & ~d) + k[5] - 701558691 | 0;
    a  = (a << 5 | a >>> 27) + b | 0;
    d += (a & c | b & ~c) + k[10] + 38016083 | 0;
    d  = (d << 9 | d >>> 23) + a | 0;
    c += (d & b | a & ~b) + k[15] - 660478335 | 0;
    c  = (c << 14 | c >>> 18) + d | 0;
    b += (c & a | d & ~a) + k[4] - 405537848 | 0;
    b  = (b << 20 | b >>> 12) + c | 0;
    a += (b & d | c & ~d) + k[9] + 568446438 | 0;
    a  = (a << 5 | a >>> 27) + b | 0;
    d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
    d  = (d << 9 | d >>> 23) + a | 0;
    c += (d & b | a & ~b) + k[3] - 187363961 | 0;
    c  = (c << 14 | c >>> 18) + d | 0;
    b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
    b  = (b << 20 | b >>> 12) + c | 0;
    a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
    a  = (a << 5 | a >>> 27) + b | 0;
    d += (a & c | b & ~c) + k[2] - 51403784 | 0;
    d  = (d << 9 | d >>> 23) + a | 0;
    c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
    c  = (c << 14 | c >>> 18) + d | 0;
    b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
    b  = (b << 20 | b >>> 12) + c | 0;
    a += (b ^ c ^ d) + k[5] - 378558 | 0;
    a  = (a << 4 | a >>> 28) + b | 0;
    d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
    d  = (d << 11 | d >>> 21) + a | 0;
    c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
    c  = (c << 16 | c >>> 16) + d | 0;
    b += (c ^ d ^ a) + k[14] - 35309556 | 0;
    b  = (b << 23 | b >>> 9) + c | 0;
    a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
    a  = (a << 4 | a >>> 28) + b | 0;
    d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
    d  = (d << 11 | d >>> 21) + a | 0;
    c += (d ^ a ^ b) + k[7] - 155497632 | 0;
    c  = (c << 16 | c >>> 16) + d | 0;
    b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
    b  = (b << 23 | b >>> 9) + c | 0;
    a += (b ^ c ^ d) + k[13] + 681279174 | 0;
    a  = (a << 4 | a >>> 28) + b | 0;
    d += (a ^ b ^ c) + k[0] - 358537222 | 0;
    d  = (d << 11 | d >>> 21) + a | 0;
    c += (d ^ a ^ b) + k[3] - 722521979 | 0;
    c  = (c << 16 | c >>> 16) + d | 0;
    b += (c ^ d ^ a) + k[6] + 76029189 | 0;
    b  = (b << 23 | b >>> 9) + c | 0;
    a += (b ^ c ^ d) + k[9] - 640364487 | 0;
    a  = (a << 4 | a >>> 28) + b | 0;
    d += (a ^ b ^ c) + k[12] - 421815835 | 0;
    d  = (d << 11 | d >>> 21) + a | 0;
    c += (d ^ a ^ b) + k[15] + 530742520 | 0;
    c  = (c << 16 | c >>> 16) + d | 0;
    b += (c ^ d ^ a) + k[2] - 995338651 | 0;
    b  = (b << 23 | b >>> 9) + c | 0;
    a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
    a  = (a << 6 | a >>> 26) + b | 0;
    d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
    d  = (d << 10 | d >>> 22) + a | 0;
    c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
    c  = (c << 15 | c >>> 17) + d | 0;
    b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
    b  = (b << 21 |b >>> 11) + c | 0;
    a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
    a  = (a << 6 | a >>> 26) + b | 0;
    d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
    d  = (d << 10 | d >>> 22) + a | 0;
    c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
    c  = (c << 15 | c >>> 17) + d | 0;
    b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
    b  = (b << 21 |b >>> 11) + c | 0;
    a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
    a  = (a << 6 | a >>> 26) + b | 0;
    d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
    d  = (d << 10 | d >>> 22) + a | 0;
    c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
    c  = (c << 15 | c >>> 17) + d | 0;
    b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
    b  = (b << 21 |b >>> 11) + c | 0;
    a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
    a  = (a << 6 | a >>> 26) + b | 0;
    d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
    d  = (d << 10 | d >>> 22) + a | 0;
    c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
    c  = (c << 15 | c >>> 17) + d | 0;
    b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
    b  = (b << 21 | b >>> 11) + c | 0;
    x[0] = a + x[0] | 0;
    x[1] = b + x[1] | 0;
    x[2] = c + x[2] | 0;
    x[3] = d + x[3] | 0;
};

const hexChars = '0123456789abcdef';
const hexOut = [];

const hex = function(x) {
    const hc = hexChars;
    const ho = hexOut;
    let n, offset, j;
    for (let i = 0; i < 4; i++) {
        offset = i * 8;
        n = x[i];
        for ( j = 0; j < 8; j += 2 ) {
            ho[offset+1+j] = hc.charAt(n & 0x0F);
            n >>>= 4;
            ho[offset+0+j] = hc.charAt(n & 0x0F);
            n >>>= 4;
        }
    }
    return ho.join('');
};

const MD5 = function() {
    this._dataLength = 0;
    this._state = new Int32Array(4);
    this._buffer = new ArrayBuffer(68);
    this._bufferLength = 0;
    this._buffer8 = new Uint8Array(this._buffer, 0, 68);
    this._buffer32 = new Uint32Array(this._buffer, 0, 17);
    this.start();
};

const stateIdentity = new Int32Array([1732584193, -271733879, -1732584194, 271733878]);
const buffer32Identity = new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

MD5.prototype.appendStr = function(str) {
    const buf8 = this._buffer8;
    const buf32 = this._buffer32;
    let bufLen = this._bufferLength;
    let code;
    for ( let i = 0; i < str.length; i++ ) {
        code = str.charCodeAt(i);
        if ( code < 128 ) {
            buf8[bufLen++] = code;
        } else if ( code < 0x800 ) {
            buf8[bufLen++] = (code >>> 6) + 0xC0;
            buf8[bufLen++] = code & 0x3F | 0x80;
        } else if ( code < 0xD800 || code > 0xDBFF ) {
            buf8[bufLen++] = (code >>> 12) + 0xE0;
            buf8[bufLen++] = (code >>> 6 & 0x3F) | 0x80;
            buf8[bufLen++] = (code & 0x3F) | 0x80;
        } else {
            code = ((code - 0xD800) * 0x400) + (str.charCodeAt(++i) - 0xDC00) + 0x10000;
            if ( code > 0x10FFFF ) {
                throw 'Unicode standard supports code points up to U+10FFFF';
            }
            buf8[bufLen++] = (code >>> 18) + 0xF0;
            buf8[bufLen++] = (code >>> 12 & 0x3F) | 0x80;
            buf8[bufLen++] = (code >>> 6 & 0x3F) | 0x80;
            buf8[bufLen++] = (code & 0x3F) | 0x80;
        }
        if ( bufLen >= 64 ) {
            this._dataLength += 64;
            md5cycle(this._state, buf32);
            bufLen -= 64;
            buf32[0] = buf32[16];
        }
    }
    this._bufferLength = bufLen;
    return this;
};

MD5.prototype.start = function() {
    this._dataLength = 0;
    this._bufferLength = 0;
    this._state.set(stateIdentity);
    return this;
};

MD5.prototype.end = function(raw) {
    const bufLen = this._bufferLength;
    this._dataLength += bufLen;
    const buf8 = this._buffer8;
    buf8[bufLen] = 0x80;
    buf8[bufLen+1] =  buf8[bufLen+2] =  buf8[bufLen+3] = 0;
    const buf32 = this._buffer32;
    let i = (bufLen >> 2) + 1;
    buf32.set(buffer32Identity.subarray(i), i);
    if (bufLen > 55) {
        md5cycle(this._state, buf32);
        buf32.set(buffer32Identity);
    }
    const dataBitsLen = this._dataLength * 8;
    if ( dataBitsLen <= 0xFFFFFFFF ) {
        buf32[14] = dataBitsLen;
    } else {
        const matches = dataBitsLen.toString(16).match(/(.*?)(.{0,8})$/);
        const lo = parseInt(matches[2], 16);
        const hi = parseInt(matches[1], 16) || 0;
        buf32[14] = lo;
        buf32[15] = hi;
    }
    md5cycle(this._state, buf32);
    return !!raw ? this._state : hex(this._state);
};

const onePassHasher = new MD5();

MD5.hashStr = function(str, raw) {
    return onePassHasher
        .start()
        .appendStr(str)
        .end(raw);
};

export const YaMD5 = MD5;

/******************************************************************************/

// targets on these domains are never internal
export const internalLinkDomainsDefault = [
  'google.com', 'asiaxpat.com',
  'columbiagreenemedia.com', '163.com', 'sohu.com', 'zol.com.cn', 'baidu.com',
  'yahoo.com', 'facebook.com', 'flashback.org',
  'amazon.ae', 'amazon.ca', 'amazon.cn', 'amazon.co.jp', 'amazon.co.uk',
  'amazon.com', 'amazon.com.au', 'amazon.com.be', 'amazon.com.br',
  'amazon.com.mx', 'amazon.com.tr', 'amazon.de', 'amazon.eg', 'amazon.es',
  'amazon.fr', 'amazon.in', 'amazon.it', 'amazon.nl', 'amazon.pl',
  'amazon.sa', 'amazon.se', 'amazon.sg',
];

export const type = function (obj) {
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
};

export const arrayRemove = function (arr, obj) {
  const i = arr.indexOf(obj);
  if (i !== -1) {
    arr.splice(i, 1);
    return true;
  }
  return false;
};

export const trimChar = function (s, chr) {
  while (s.endsWith(chr)) {
    s = s.substring(0, s.length - chr.length);
  }
  return s;
};

export const byField = function (prop) {
  let sortOrder = 1;
  if (prop[0] === '-') {
    sortOrder = -1;
    prop = prop.substr(1);
  }
  return function (a, b) {
    const result = (a[prop] < b[prop]) ? -1 : (a[prop] > b[prop]) ? 1 : 0;
    return result * sortOrder;
  };
};

// Compact a count for display on the toolbar badge (port of MV2 µb.formatCount):
// exact under 1000, then 'k'/'M' shorthand so the badge stays legible.
export const formatCount = function (count) {
  if (typeof count !== 'number') return '';
  const s = `${count}`;
  if (count < 1000) return s;
  if (count < 10000) return '>' + s.slice(0, 1) + 'k';
  if (count < 100000) return s.slice(0, 2) + 'k';
  if (count < 1000000) return s.slice(0, 3) + 'k';
  return s.slice(0, -6) + 'M';
};

/************************ Hashing *****************************/

// DO NOT MODIFY
export const computeHash = function (ad) {
  if (!ad) return;

  if (!ad.contentData || !ad.pageUrl) {
    console.error('Invalid Ad: no contentData || pageUrl', ad);
    return;
  }

  let hash = ad.targetUrl || ad.pageDomain || ad.pageUrl;

  const keys = Object.keys(ad.contentData).sort();

  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== 'width' && keys[i] !== 'height')
      hash += '::' + ad.contentData[keys[i]];
  }

  return YaMD5.hashStr(hash);
};

/************************ URL utils *****************************/

export const parseHostname = function (url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return undefined;
  }
};

export const parseDomain = function (url, useLast) {
  try {
    const domains = decodeURIComponent(url).match(/https?:\/\/[^?\/]+/g);
    return (domains && domains.length > 0)
      ? new URL(useLast ? domains[domains.length - 1] : domains[0]).hostname
      : undefined;
  } catch (e) {
    return undefined;
  }
};

// Registrable domain of a hostname
const reIPAddressNaive = /^\d+\.\d+\.\d+\.\d+$|^\[[\da-f:]+\]$/i;
const reGenericSecondLevel = /^(co|com|net|org|gov|edu|ac|or|ne|go)$/;

export const domainFromHostname = function (hostname) {
  if (!hostname || reIPAddressNaive.test(hostname)) return hostname;
  const labels = hostname.split('.');
  const tld = labels[labels.length - 1], sld = labels[labels.length - 2];
  const keep = tld.length === 2 && reGenericSecondLevel.test(sld) ? 3 : 2;
  return labels.slice(-keep).join('.');
};

export const isValidDomain = function (v) {
  const re = /^(?!:\/\/)([a-zA-Z0-9-]+\.){0,5}[a-zA-Z0-9-][a-zA-Z0-9-]+\.[a-zA-Z]{2,64}?$/gi;
  return v ? re.test(v) : false;
};

/*
 * Start with resolvedTargetUrl if available, else use targetUrl
 * Then extract the last domain from the (possibly complex) url
 */
export const targetDomain = function (ad) {
  const dom = parseDomain(ad.resolvedTargetUrl || ad.targetUrl, true);
  if (!dom) console.warn('Unable to parse domain: ' + ad.targetUrl);
  return dom;
};
