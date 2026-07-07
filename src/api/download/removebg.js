const fetch = require('node-fetch');
const FormData = require('form-data');

async function removeBackground(imageUrl) {
  // 1. Ambil buffer gambar dari URL parameter yang dikirimkan user
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error('Gagal mengunduh gambar dari URL yang diberikan');
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

  // 2. Susun form data untuk dikirim ke API Pixelcut
  const rbgForm = new FormData();
  rbgForm.append('image', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  rbgForm.append('format', 'png');
  rbgForm.append('model', 'v1');

  // 3. Request ke backend Pixelcut Matte API
  const rbgRes = await fetch('https://api2.pixelcut.app/image/matte/v1', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
      'x-locale': 'en',
      'x-client-version': 'web:pixa.com:4a5b0af2',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'origin': 'https://www.pixa.com',
      'sec-fetch-site': 'cross-site',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
      'referer': 'https://www.pixa.com/',
      'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6',
      ...rbgForm.getHeaders() // Sertakan boundary form data otomatis
    },
    body: rbgForm
  });

  if (!rbgRes.ok) throw new Error('Gagal memproses penghapusan background dari server produksi');

  // 4. Ubah hasil response menjadi buffer data gambar
  const resultBuffer = Buffer.from(await rbgRes.arrayBuffer());
  return resultBuffer;
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

      // Memproses gambar menggunakan fungsi removeBackground
      const processedImageBuffer = await removeBackground(url);

      // Skema keluaran respons JSON terstruktur
      const responseData = {
        status: true,
        creator: "Rin imup",
        data: {
          type: 'image/png',
          title: 'Remove Background Result',
          media: [
            `data:image/png;base64,${processedImageBuffer.toString('base64')}`
          ],
          description: 'Latar belakang gambar berhasil dihapus menggunakan Pixelcut Engine.'
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
    description: 'Menghilangkan background latar belakang gambar secara otomatis menjadi transparan.',
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        description: 'masukan url image nya'
      }
    ],
  }
};
