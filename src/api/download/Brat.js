const fetch = require('node-fetch');
const FormData = require('form-data');

// Fungsi untuk upload buffer gambar Brat ke Catbox
async function uploadToCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', buffer, { filename: 'brat.png', contentType: 'image/png' });

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
  form.append('file', buffer, { filename: 'brat.png', contentType: 'image/png' });

  const res = await fetch('https://file.io/?expires=1d', {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });

  const json = await res.json();
  if (!json.success) throw new Error('File.io juga gagal');
  return json.link;
}

module.exports = {
    method: 'get',
    path: '/maker/brat',
    handler: async (req, res) => {
        try {
            // Mengambil input teks dari parameter (?text=... atau ?q=...)
            const inputText = req.query?.text || req.query?.q;

            if (!inputText) {
                return res.status(400).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'Parameter teks diperlukan! Contoh: ?text=brat style'
                });
            }

            // URL Sumber utama dari Hugging Face Space
            const bratSourceUrl = `https://aqul-brat.hf.space?text=${encodeURIComponent(inputText)}`;

            // 1. Download gambar menggunakan arrayBuffer() agar aman dari crash biner di Vercel
            const responseImg = await fetch(bratSourceUrl);
            if (!responseImg.ok) {
                throw new Error('Gagal mengambil gambar dari server hf.space');
            }
            const imageBuffer = Buffer.from(await responseImg.arrayBuffer());

            if (!imageBuffer || imageBuffer.length === 0) {
                throw new Error('Buffer gambar kosong / gagal diproses.');
            }

            // 2. Upload otomatis ke Catbox dengan fallback ke File.io
            let finalMediaUrl;
            try {
                finalMediaUrl = await uploadToCatbox(imageBuffer);
            } catch (err) {
                console.error('Catbox sepertinya down, beralih ke File.io...', err.message);
                finalMediaUrl = await uploadToFileIo(imageBuffer);
            }

            // Struktur data JSON menggunakan properti "media" agar otomatis muncul di UI Dashboard Maker
            res.json({
                status: true,
                creator: "Rin imup",
                data: {
                    type: 'image/png',
                    title: 'Brat Text Generator',
                    text: inputText,
                    media: [finalMediaUrl], 
                    description: `Berhasil buat Brat: "${inputText}"`
                }
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                creator: "Rin imup",
                message: err.message || 'Terjadi kesalahan internal saat membuat teks Brat.'
            });
        }
    },
    metadata: {
        category: 'Maker',
        description: 'Membuat sticker Brat di mana text di ubah menjadi sticker dengan keren.',
        parameters: [
            {
                name: 'text',
                in: 'query',
                required: true,
                description: 'Teks yang ingin diubah menjadi sticker Brat.'
            }
        ],
    }
};
