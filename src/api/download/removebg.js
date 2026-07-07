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

// Fungsi utama memproses removebg menggunakan API Cuki Biz
async function removeBackground(imageUrl) {
  const apikey = 'cuki-x';
  const apiUrl = `https://api.cuki.biz.id/api/editing/removebg?apikey=${apikey}&image=${encodeURIComponent(imageUrl)}`;

  const res = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'x-api-key': apikey,
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`API Cuki Error: Status ${res.status}`);
  }

  // Menerima data biner stream gambar mentah secara aman tanpa corrupt
  const buffer = await res.buffer();
  return buffer;
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

      // Ambil hasil pemrosesan gambar berbentuk buffer dari API Cuki
      const processedBuffer = await removeBackground(url);

      if (!processedBuffer || processedBuffer.length === 0) {
        throw new Error('Gagal memproses data gambar dari API sumber.');
      }

      // Unggah otomatis ke Catbox (Fallback ke File.io jika down)
      let finalImageUrl;
      try {
        finalImageUrl = await uploadToCatbox(processedBuffer);
      } catch (err) {
        console.error('Catbox sepertinya down, beralih ke File.io...', err.message);
        finalImageUrl = await uploadToFileIo(processedBuffer);
      }

      // Output data JSON rapi berformat URL bersih
      const responseData = {
        status: true,
        creator: "Rin imup",
        data: {
          type: 'image/png',
          title: 'Remove Background Result',
          media: [finalImageUrl],
          description: 'Latar belakang gambar berhasil dihapus menggunakan Cuki API Engine.'
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
    description: 'Menghilangkan background gambar menjadi transparan menggunakan integrasi API Cuki.',
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        description: 'URL langsung menuju file gambar publik'
      }
    ],
  }
};
