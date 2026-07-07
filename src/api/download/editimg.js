const fetch = require('node-fetch');
const FormData = require('form-data');

// Fungsi utama memproses manipulasi gambar via Banana-Nano AI dengan proteksi Timeout
async function processEditImage(imageUrl, promptText) {
  // Buat controller untuk membatasi waktu tunggu request (Timeout 25 detik)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    // 1. Download gambar dari URL parameter menjadi buffer biner
    const imageRes = await fetch(imageUrl, { signal: controller.signal });
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
      body: form,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Banana Nano Error: Status ${response.status}`);
    }

    const jsonResult = await response.json();
    const targetResultUrl = jsonResult.r2_url || jsonResult.output_image_url || jsonResult.data?.image_url;
    
    if (!targetResultUrl) {
      throw new Error(jsonResult.message || 'API Banana Nano tidak mengembalikan URL gambar hasil.');
    }

    return targetResultUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Proses AI Banana Nano memakan waktu terlalu lama (Timeout 25 detik). Silakan coba lagi.');
    }
    throw error;
  }
}

module.exports = {
  method: 'get',
  path: '/tools/editimg',
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

      // Menjalankan proses manipulasi gambar AI (Mendapatkan URL gambar hasil)
      const finalMediaUrl = await processEditImage(imageUrl, promptText);

      // FIX UTAMA: Unduh hasil gambar tersebut untuk dijadikan Buffer biner murni
      const resultImageRes = await fetch(finalMediaUrl);
      if (!resultImageRes.ok) throw new Error('Gagal mengambil gambar hasil akhir dari CDN.');
      const finalBuffer = Buffer.from(await resultImageRes.arrayBuffer());

      // Atur header respons agar dibaca browser sebagai gambar langsung
      res.setHeader('Content-Type', 'image/jpeg');
      
      // Kirim data buffer gambar mentah langsung ke client
      return res.send(finalBuffer);

    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "Rin imup",
        message: err.message || 'Terjadi kesalahan internal saat memproses gambar.'
      });
    }
  },
  metadata: {
    category: 'Tools',
    description: 'Mengedit gambar menggunakan prompt dan menghasilkan gambar yng sesuai',
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        description: 'Link url image yg ingin di edit'
      },
      {
        name: 'prompt',
        in: 'query',
        required: true,
        description: 'Perintah edit gambar.'
      }
    ],
  }
};    
