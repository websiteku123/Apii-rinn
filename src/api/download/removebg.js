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

async function removeBackground(imageUrl) {
  // 1. Ambil buffer gambar dari URL parameter
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error('Gagal mengunduh gambar dari URL yang diberikan');
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

  // 2. Susun form data dengan aman untuk Environment Node/Vercel
  const rbgForm = new FormData();
  rbgForm.append('image', imageBuffer, {
    filename: 'image.jpg',
    contentType: 'image/jpeg',
  });
  rbgForm.append('format', 'png');
  rbgForm.append('model', 'v1');

  // 3. Request ke backend Pixelcut Matte API
  const rbgRes = await fetch('https://api2.pixelcut.app/image/matte/v1', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'x-locale': 'en',
      'x-client-version': 'web:pixa.com:4a5b0af2',
      'origin': 'https://www.pixa.com',
      'referer': 'https://www.pixa.com/',
      ...rbgForm.getHeaders() // Ini penting agar Boundary Header-nya pas dan tidak corrupt di Vercel
    },
    body: rbgForm
  });

  if (!rbgRes.ok) {
    const errorText = await rbgRes.text().catch(() => '');
    throw new Error(`Pixelcut API Error: ${rbgRes.status} - ${errorText || 'Gagal memproses gambar'}`);
  }

  return Buffer.from(await rbgRes.arrayBuffer());
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

      // Proses hapus background (dapatkan buffer PNG)
      const processedBuffer = await removeBackground(url);

      // Logika upload: Coba Catbox dulu, kalau down pindah ke File.io
      let finalImageUrl;
      try {
        finalImageUrl = await uploadToCatbox(processedBuffer);
      } catch (err) {
        console.error('Catbox sepertinya down, beralih ke File.io...', err.message);
        finalImageUrl = await uploadToFileIo(processedBuffer);
      }

      // Struktur respons rapi berupa URL link media mentah wok
      const responseData = {
        status: true,
        creator: "Rin imup",
        data: {
          type: 'image/png',
          title: 'Remove Background Result',
          media: [finalImageUrl],
          description: 'Latar belakang gambar berhasil dihapus'
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
    description: 'Menghilangkan background gambar menjadi transparan.',
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        description: 'Masukan link url image'
      }
    ],
  }
};      
