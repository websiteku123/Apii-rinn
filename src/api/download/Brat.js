const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { writeFileSync, existsSync, readFileSync } = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Konfigurasi Jalur Penyimpanan Sementara di Vercel (/tmp)
const FONT_URL = 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/ARIALN.ttf';
const EMOJI_JSON_URL = 'https://media.githubusercontent.com/media/Ditzzx-vibecoder/entahlah/main/emoji-apple.json';
const FONT_PATH = path.join('/tmp', 'ARIALN.ttf');
const EMOJI_JSON_PATH = path.join('/tmp', 'emoji-apple.json');

const THEMES = {
  black: { bg: '#000000', text: '#ffffff' },
  white: { bg: '#ffffff', text: '#000000' },
  green: { bg: '#8ace00', text: '#000000' }
};

async function downloadFile(url, dest) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf;
}

async function ensureFont() {
  if (!existsSync(FONT_PATH)) await downloadFile(FONT_URL, FONT_PATH);
  GlobalFonts.registerFromPath(FONT_PATH, 'ArialNarrow');
}

let emojiMap = null;
const emojiImageCache = new Map();

function emojiToUnicode(emoji) {
  return [...emoji].map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join('-');
}

async function loadEmojiMap() {
  if (emojiMap) return emojiMap;
  if (!existsSync(EMOJI_JSON_PATH)) await downloadFile(EMOJI_JSON_URL, EMOJI_JSON_PATH);
  emojiMap = JSON.parse(readFileSync(EMOJI_JSON_PATH, 'utf-8'));
  return emojiMap;
}

async function getEmojiImage(emoji) {
  if (emojiImageCache.has(emoji)) return emojiImageCache.get(emoji);
  const map = await loadEmojiMap();
  const base = emojiToUnicode(emoji);
  const variants = [
    base,
    base.replace(/-fe0f/gi, ''),
    `${base.replace(/-fe0f/gi, '')}-fe0f`,
    base.toUpperCase(),
    base.replace(/-fe0f/gi, '').toUpperCase(),
    base.replace(/-fe0f/gi, '').toUpperCase() + '-FE0F'
  ];
  let b64 = null;
  for (const v of variants) {
    if (map[v]) { b64 = map[v]; break; }
  }
  if (!b64) return null;
  const img = await loadImage(Buffer.from(b64, 'base64'));
  emojiImageCache.set(emoji, img);
  return img;
}

async function drawAppleEmoji(ctx, emoji, x, y, size) {
  const img = await getEmojiImage(emoji);
  if (!img) { ctx.fillText(emoji, x, y); return; }
  ctx.drawImage(img, x, y, size, size);
}

const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu;

function measureTextCustom(ctx, text, fontSize) {
  const parts = text.split(EMOJI_REGEX);
  let w = 0;
  for (const part of parts) {
    if (!part) continue;
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(part)) w += fontSize;
    else w += ctx.measureText(part).width;
    EMOJI_REGEX.lastIndex = 0;
  }
  return w;
}

async function drawTextWithEmojis(ctx, text, x, y, fontSize) {
  const parts = text.split(EMOJI_REGEX);
  let curX = x;
  for (const part of parts) {
    if (!part) continue;
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(part)) {
      await drawAppleEmoji(ctx, part, curX, y, fontSize);
      curX += fontSize;
    } else {
      ctx.fillText(part, curX, y);
      curX += ctx.measureText(part).width;
    }
    EMOJI_REGEX.lastIndex = 0;
  }
}

function wrapText(ctx, text, maxWidth, fontSize) {
  ctx.font = `${fontSize}px ArialNarrow`;
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (measureTextCustom(ctx, test, fontSize) > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitsAt(ctx, text, fontSize, maxWidth, maxHeight, lineGap) {
  const lines = wrapText(ctx, text, maxWidth, fontSize);
  const longestWord = Math.max(...text.split(' ').map(w => measureTextCustom(ctx, w, fontSize)));
  const totalHeight = lines.length * (fontSize + lineGap) - lineGap;
  return longestWord <= maxWidth && totalHeight <= maxHeight;
}

function findBestFontSize(ctx, text, maxWidth, maxHeight, lineGap) {
  let lo = 10;
  let hi = 700;
  let best = lo;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fitsAt(ctx, text, mid, maxWidth, maxHeight, lineGap)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

// Uploader ke Catbox
async function uploadToCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', buffer, { filename: 'brat.png', contentType: 'image/png' });

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });
  if (!res.ok) throw new Error('Catbox Gagal');
  const text = await res.text();
  return text.trim();
}

// Uploader Cadangan ke File.io
async function uploadToFileIo(buffer) {
  const form = new FormData();
  form.append('file', buffer, { filename: 'brat.png', contentType: 'image/png' });
  const res = await fetch('https://file.io/?expires=1d', { method: 'POST', headers: form.getHeaders(), body: form });
  const json = await res.json();
  if (!json.success) throw new Error('File.io Gagal');
  return json.link;
}

module.exports = {
  method: 'get',
  path: '/maker/brat',
  handler: async (req, res) => {
    try {
      const inputText = req.query?.text || req.query?.q;
      const themeInput = req.query?.theme || 'white';

      if (!inputText) {
        return res.status(400).json({
          status: false,
          creator: "Rin imup",
          message: 'Parameter teks diperlukan! Contoh: ?text=Halo&theme=green'
        });
      }

      const selectedTheme = THEMES[themeInput] || THEMES.white;

      const size = 1000;
      const padding = 80;
      const lineGap = 20;
      const maxWidth = size - padding * 2;
      const maxHeight = size - padding * 2;

      // Memastikan font dan emoji terunduh aman di direktori /tmp
      await ensureFont();
      await loadEmojiMap();

      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');

      const fontSize = findBestFontSize(ctx, inputText, maxWidth, maxHeight, lineGap);
      const lines = wrapText(ctx, inputText, maxWidth, fontSize);

      ctx.fillStyle = selectedTheme.bg;
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = selectedTheme.text;
      ctx.font = `${fontSize}px ArialNarrow`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const totalTextHeight = lines.length * (fontSize + lineGap) - lineGap;
      let y = (size - totalTextHeight) / 2;
      for (const line of lines) {
        await drawTextWithEmojis(ctx, line, padding, y, fontSize);
        y += fontSize + lineGap;
      }

      // Encode canvas langsung menjadi buffer memory biner
      const buffer = await canvas.encode('png');

      // Unggah ke layanan hosting gambar eksternal
      let finalMediaUrl;
      try {
        finalMediaUrl = await uploadToCatbox(buffer);
      } catch (err) {
        console.error('Catbox bermasalah, beralih ke File.io...', err.message);
        finalMediaUrl = await uploadToFileIo(buffer);
      }

      res.json({
        status: true,
        creator: "Rin imup",
        data: {
          type: 'image/png',
          title: 'Brat Canvas Custom Generator',
          text: inputText,
          theme: themeInput,
          media: [finalMediaUrl],
          description: `Berhasil membuat Brat Canvas kustom warna.`
        }
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "Rin imup",
        message: err.message || 'Terjadi kesalahan saat memproses gambar Brat Canvas.'
      });
    }
  },
  metadata: {
    category: 'Maker',
    description: 'Membuat stiker teks bergaya Brat dengan warna tema (white, black, green) kustom.',
    parameters: [
      {
        name: 'text',
        in: 'query',
        required: true,
        description: 'Teks tulisan stiker Brat'
      },
      {
        name: 'theme',
        in: 'query',
        required: false,
        description: 'Pilihan warna tema background: white, black, atau green'
      }
    ],
  }
};
