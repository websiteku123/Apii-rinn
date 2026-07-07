const fetch = require('node-fetch');
const FormData = require('form-data');

// Fungsi untuk upload buffer gambar hasil edit ke Catbox
async function uploadToCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', buffer, { filename: 'edited_image.jpg', contentType: 'image/jpeg' });

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

// Fungsi cadangan upload jika Catbox down (Upload ke File.io)
async function uploadToFileIo(buffer) {
  const form = new FormData();
  form.append('file', buffer, { filename: 'edited_image.jpg', contentType: 'image/jpeg' });

  const res = await fetch('https://file.io/?expires=1d', {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });

  const json = await res.json();
  if (!json.success) throw new Error('File.io juga gagal');
  return json.link;
}

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
    body: form,
    timeout: 90000 // Berikan waktu timeout panjang untuk proses rendering AI
  });

  if (!response.ok) {
    throw new Error(`API Banana Nano Error: Status ${response.status}`);
  }

  const jsonResult = await response.json();
  const targetResultUrl = jsonResult.r2_url || jsonResult.output_image_url || jsonResult.data?.image_url;
  
  if (!targetResultUrl) {
    throw new Error(jsonResult.message || 'API Banana Nano tidak mengembalikan URL gambar hasil pemrosesan.');
  }

  // 4. Download kembali gambar hasil render AI untuk diubah menjadi buffer agar bisa dihosting mandiri
  const finalResultRes = await fetch(targetResultUrl);
  if (!finalResultRes.ok) throw new Error('Gagal mengunduh hasil gambar matang dari cdn resource');
  
  return Buffer.from(await finalResultRes.arrayBuffer());
}

module.exports = {
  method: 'get',
  path: '/tools/editimg',
  handler: async (req, res) => {
    try {
      const imageUrl = req.query?.url || req.query?.image;
      const promptText = req.query?.prompt || req.query?.q;

      // Validasi ketersediaan parameter input
      if (!imageUrl || !promptText) {
        return res.status(400).json({
          status: false,
          creator: "Rin imup",
          message: 'Parameter kurang lengkap! Dibutuhkan ?url=... (URL Gambar) dan &prompt=... (Perintah Edit)'
        });
      }

      // Menjalankan proses manipulasi gambar AI
      const editedBuffer = await processEditImage(imageUrl, promptText);

      // Mengunggah ke Catbox / File.io cadangan
      let finalMediaUrl;
      try {
        finalMediaUrl = await uploadToCatbox(editedBuffer);
      } catch (err) {
        console.error('Catbox bermasalah, beralih unggah ke File.io...', err.message);
        finalMediaUrl = await uploadToFileIo(editedBuffer);
      }

      // Output respons terstruktur untuk UI Dashboard kategori Tools
      res.json({
        status: true,
        creator: "Rin imup",
        data: {
          type: 'image/jpeg',
          title: 'AI Image Editor Result',
          prompt: promptText,
          media: [finalMediaUrl],
          description: 'Gambar berhasil di edit.'
        }
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "Rin imup",
        message: err.message || 'Terjadi kesalahan internal saat memproses manipulasi gambar'
      });
    }
  },
  metadata: {
    category: 'Tools',
    description: 'Mengedit, memodifikasi, atau mendesain ulang gambar menggunakan prompt.',
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        description: 'link url gambar yang ingin diedit'
      },
      {
        name: 'prompt',
        in: 'query',
        required: true,
        description: 'Perintah edit img nya'
      }
    ],
  }
};
