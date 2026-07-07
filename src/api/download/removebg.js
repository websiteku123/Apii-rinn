    const fetch = require('node-fetch');
const FormData = require('form-data');

// Fungsi untuk upload buffer gambar ke Catbox
async function uploadToCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', buffer, { filename: 'removebg.png', contentType: 'image/png' });

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });

  if (!res.ok) throw new Error('Catbox Down/Gagal');
  const text = await res.text();
  if (!text.includes('https://')) throw new Error('Respon Catbox tidak valid');
  return text.trim();
}

// Fungsi cadangan jika Catbox down (Upload ke File.io)
async function uploadToFileIo(buffer) {
  const form = new FormData();
  form.append('file', buffer, { filename: 'removebg.png', contentType: 'image/png' });

  const res = await fetch('https://file.io/?expires=1d', {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });

  const json = await res.json();
  if (!json.success) throw new Error('File.io juga gagal');
  return json.link;
}

// Engine Baru: Menggunakan prod-api remover yang anti-block Vercel
async function removeBackground(imageUrl) {
  const targetApi = `https://api.prodia.com/v1/tasks`; 
  // Jika Prodia butuh key, kita gunakan alternatif universal free-scrape tanpa API key:
  const backupApiUrl = `https://image.novita.ai/v3/remove-background`;

  // Mari gunakan endpoint free API remover via penghapus latar belakang berbasis sam/rembg publik
  const res = await fetch(`https://tools.miku.it.id/api/removebg?url=${encodeURIComponent(imageUrl)}`).then(v => v.json()).catch(() => null);
  
  if (res && res.status && res.result) {
    const imgRes = await fetch(res.result);
    if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
  }

  // Fallback Engine 2 jika engine utama gagal (Menggunakan skema langsung serverless matte)
  const fallbackRes = await fetch('https://api.itsrose.rest/image/removebg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl })
  }).then(v => v.json()).catch(() => null);

  if (fallbackRes?.result?.url) {
    const imgRes = await fetch(fallbackRes.result.url);
    if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
  }

  // Fallback Engine 3: Menggunakan skema form-data tools alternatif
  const form = new FormData();
  form.append('image_url', imageUrl);
  const rbgRes = await fetch('https://api.remove.bg/v1.0/removebg', { // jika punya token
    method: 'POST',
    headers: { 'X-Api-Key': 'MANUAL_KEY_JIKA_ADA' },
    body: form
  }).catch(() => null);
  
  if (rbgRes && rbgRes.ok) return Buffer.from(await rbgRes.arrayBuffer());

  // Jika semua scraper free di atas block, gunakan API buatan prod-free ini wok:
  const finalFallback = await fetch(`https://endpoint.miftahganzz.my.id/api/tools/removebg?url=${encodeURIComponent(imageUrl)}`).then(v => v.json()).catch(() => null);
  if (finalFallback?.data?.url || finalFallback?.result) {
    const imgRes = await fetch(finalFallback?.data?.url || finalFallback?.result);
    if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
  }

  throw new Error('Semua antrean server background remover sedang sibuk/IP Vercel terblokir. Coba beberapa saat lagi.');
}

module.exports = {
  method: 'get',
  path: '/tools/removebg',
  handler: async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          creator: "Rin imup",
          message: 'Parameter diperlukan: ?url=... (URL gambar yang ingin dihapus background-nya)'
        });
      }

      // Proses hapus background dengan engine anti-block
      const processedBuffer = await removeBackground(url);

      // Logika upload ke Catbox / File.io
      let finalImageUrl;
      try {
        finalImageUrl = await uploadToCatbox(processedBuffer);
      } catch (err) {
        console.error('Catbox sepertinya down, beralih ke File.io...');
        finalImageUrl = await uploadToFileIo(processedBuffer);
      }

      const responseData = {
        status: true,
        creator: "Rin imup",
        data: {
          type: 'image/png',
          title: 'Remove Background Result',
          media: [finalImageUrl],
          description: 'Latar belakang gambar berhasil diproses dengan bypass engine serverless.'
        }
      };

      res.json(responseData);
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "Rin imup",
        message: err.message || 'Terjadi kesalahan saat memproses penghapusan latar belakang gambar'
      });
    }
  },
  metadata: {
    category: 'Tools',
    description: 'Menghilangkan background gambar menjadi transparan bypass block hosting Vercel.',
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        description: 'URL langsung menuju gambar publik (jpg/jpeg/png)'
      }
    ],
  }
};
