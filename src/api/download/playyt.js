const { createDecipheriv } = require('crypto');
const yts = require('yt-search');
const sharp = require('sharp');
const fetch = require('node-fetch');
const { prepareWAMessageMedia } = require('@itsliaaa/baileys');

const METADATA_DECRYPTION_KEY = Buffer.from(
  'C5D58EF67A7584E4A29F6C35BBC4EB12',
  'hex'
);

const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'https://yt.savetube.me',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'
};

// Fungsi pendukung untuk download via Savetube
async function savetube(url, { downloadType = 'audio', quality = '128kbps' } = {}) {
  const idMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/
  );

  if (!idMatch) throw new Error('URL YouTube tidak valid');

  const videoId = idMatch[1];

  const cdnRes = await fetch('https://media.savetube.vip/api/random-cdn', {
    headers: HEADERS
  }).then(v => v.json()).catch(() => null);

  if (!cdnRes?.cdn) throw new Error('CDN tidak tersedia');

  const cdn = cdnRes.cdn;

  const info = await fetch(`https://${cdn}/v2/info`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      url: 'https://www.youtube.com/watch?v=' + videoId
    })
  }).then(v => v.json()).catch(() => null);

  if (!info?.data) throw new Error('Metadata kosong');

  let metadata;

  try {
    const encrypted = Buffer.from(info.data, 'base64');

    const decipher = createDecipheriv(
      'aes-128-cbc',
      METADATA_DECRYPTION_KEY,
      encrypted.subarray(0, 16)
    );

    const decrypted = Buffer.concat([
      decipher.update(encrypted.subarray(16)),
      decipher.final()
    ]);

    metadata = JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    throw new Error('Decrypt metadata gagal');
  }

  if (!metadata?.key) throw new Error('Key download tidak ditemukan');

  const dl = await fetch(`https://${cdn}/download`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      id: videoId,
      downloadType,
      quality,
      key: metadata.key
    })
  }).then(v => v.json()).catch(() => null);

  if (!dl?.data?.downloadUrl)
    throw new Error(dl?.message || 'Download gagal');

  return {
    title: metadata.title,
    duration: metadata.durationLabel,
    thumbnail: metadata.thumbnail,
    url: dl.data.downloadUrl
  };
}

async function savetubeRetry(url, opts, retry = 3) {
  let lastErr;

  for (let i = 0; i < retry; i++) {
    try {
      return await savetube(url, opts);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr;
}

async function getThumb(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Thumbnail gagal diambil');

    const raw = Buffer.from(await res.arrayBuffer());

    return await sharp(raw)
      .resize(1280, 720, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 90
      })
      .toBuffer();
  } catch (e) {
    console.error('Thumb Error:', e);
    return Buffer.alloc(0);
  }
}

async function createHighQualityThumbnail(conn, thumb) {
  try {
    if (!thumb?.length) return null;

    const { imageMessage } = await prepareWAMessageMedia(
      {
        image: thumb
      },
      {
        upload: conn.waUploadToServer,
        mediaTypeOverride: 'thumbnail-link'
      }
    );

    imageMessage.width = 1280;
    imageMessage.height = 720;

    return imageMessage;
  } catch (e) {
    console.error('HQ Thumb Error:', e);
    return null;
  }
}

module.exports = {
  method: 'get',
  path: '/download/play',
  handler: async (req, res) => {
    try {
      const { url, q } = req.query;
      const input = url || q;

      if (!input) {
        return res.status(400).json({
          status: false,
          creator: "Rin imup",
          message: 'Parameter diperlukan: ?url=... atau ?q=... (pencarian lagu)'
        });
      }

      let targetUrl = input;

      // Jika input bukan URL, lakukan pencarian menggunakan yt-search
      if (!/youtube\.com|youtu\.be/i.test(input)) {
        const search = await yts(input);
        if (!search?.videos?.length) {
          return res.status(404).json({
            status: false,
            creator: "Rin imup",
            message: 'Lagu atau video tidak ditemukan'
          });
        }
        targetUrl = search.videos[0].url;
      }

      // Ambil detail lengkap video dari URL target
      const detail = await yts(targetUrl);
      const vid = detail?.videos?.[0];

      if (!vid) {
        return res.status(404).json({
          status: false,
          creator: "Rin imup",
          message: 'Detail video tidak ditemukan'
        });
      }

      // Ambil data download media menggunakan backend savetube
      const audioData = await savetubeRetry(targetUrl, {
        downloadType: 'audio',
        quality: '128kbps'
      });

      // Olah buffer thumbnail menggunakan sharp
      const thumbBuffer = await getThumb(vid.thumbnail);

      const responseData = {
        status: true,
        creator: "Rin imup",
        data: {
          title: vid.title || audioData.title || '-',
          duration: vid.timestamp || audioData.duration || '-',
          views: vid.views || 0,
          ago: vid.ago || '-',
          url: targetUrl,
          thumbnail: vid.thumbnail || audioData.thumbnail || null,
          media: {
            audio: audioData.url
          }
        },
        // Menyertakan buffer thumbnail mentah & fungsi helper jika sistem Baileys kamu membutuhkannya
        _internal: {
          thumbBuffer: thumbBuffer.toString('base64'),
          createHighQualityThumbnail
        }
      };

      res.json(responseData);
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "Rin imup",
        message: err.message || 'Terjadi kesalahan saat memproses permintaan'
      });
    }
  },
  metadata: {
    category: 'Downloader',
    description: 'Play dan download audio dari YouTube menggunakan pencarian kata kunci',
    parameters: [
      {
        name: 'q',
        in: 'query',
        required: false,
        description: 'ketik lagi nya misal (tak sanggup lagi)'
      }
    ],
  }
};
