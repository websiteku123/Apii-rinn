const fetch = require('node-fetch');
const FormData = require('form-data');

// Fungsi utama memproses manipulasi gambar via Banana-Nano AI
async function processEditImage(imageUrl, promptText) {
  // 1. Download gambar dari URL parameter menjadi buffer biner
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error('Gagal mengunduh gambar sumber dari URL yang diberikan');
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

  // 2. Susun form data untuk dikirim ke API Banana Nano
  const form = new FormData();
  form.append('file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  form.append('prompt', promptText);
  form.append('output_format', 'jpg');
  form.append('generator_slug', 'ai-image-editor');

  // 3. Request post ke API backend Banana Nano
  const response = await fetch('https://banana-nano.ai/api/nano-banana-lite-image-to-image', {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'origin': 'https://banana-nano.ai',
      'referer': 'https://banana-nano.ai/ai-image-editor',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...form.getHeaders()
    },
    body: form
  });

  if (!response.ok) {
    throw new Error(`API Banana Nano Error: Status ${response.status}`);
  }

  const jsonResult = await response.json();
  const targetResultUrl = jsonResult.r2_url || jsonResult.output_image_url || jsonResult.data?.image_url;
  
  if (!targetResultUrl) {
    throw new Error(jsonResult.message || 'API tidak mengembalikan URL gambar.');
  }

  return targetResultUrl;
}

module.exports = {
  method: 'get',
  path: '/tools/editimg',
  // Trik Vercel: Jika kamu pakai Vercel Pro, ini akan otomatis menambah limit ke 60 detik.
  // Jika pakai akun Hobby, ini akan tetap mentok di 10-15 detik tergantung regional AWS.
  config: {
    maxDuration: 60 
  },
  handler: async (req, res) => {
    try {
      const imageUrl = req.query?.url || req.query?.image;
      const promptText = req.query?.prompt || req.query?.q;

      if (!imageUrl || !promptText) {
        return res.status(400).json({
          status: false,
          creator: "Rin imup",
          message: 'Parameter kurang lengkap! Dibutuhkan ?url=... (URL Gambar) dan &prompt=... (Perintah Edit)'
        });
      }

      // Menjalankan proses manipulasi gambar AI (Mengembalikan URL CDN Langsung)
      // Ini memotong rantai download-upload ulang ke Catbox di sisi server agar menghemat durasi runtime Vercel!
      const finalMediaUrl = await processEditImage(imageUrl, promptText);

      res.json({
        status: true,
        creator: "Rin imup",
        data: {
          type: 'image/jpeg',
          title: 'AI Image Editor Result',
          prompt: promptText,
          media: [finalMediaUrl],
          description: 'Gambar berhasil dimanipulasi. Menampilkan URL CDN cloud source langsung demi kestabilan runtime.'
        }
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "Rin imup",
        message: err.message || 'Terjadi kesalahan internal / Serverless timeout saat memproses gambar.'
      });
    }
  },
  metadata: {
    category: 'Tools',
    description: 'Mengedit gambar menggunakan instruksi teks (prompt) berbasis AI Image-to-Image.',
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        description: 'URL tautan gambar publik yang ingin diedit'
      },
      {
        name: 'prompt',
        in: 'query',
        required: true,
        description: 'Perintah modifikasi teks gambar'
      }
    ],
  }
};
