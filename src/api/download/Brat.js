const fetch = require('node-fetch');

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

            // Memanfaatkan engine Hugging Face Space yang sudah kamu pakai di bot sebelumnya
            const bratImageUrl = `https://aqul-brat.hf.space?text=${encodeURIComponent(inputText)}`;

            // Struktur data JSON menggunakan properti "media" agar otomatis muncul di UI Dashboard Maker
            res.json({
                status: true,
                creator: "Rin imup",
                data: {
                    type: 'image/png',
                    title: 'Brat Text Generator',
                    text: inputText,
                    media: [bratImageUrl],
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
                description: 'Teks yang ingin diubah menjadi sticker Brat'
            }
        ],
    }
};
