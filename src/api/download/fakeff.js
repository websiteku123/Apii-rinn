const generateFF = require('fake-ff');

module.exports = {
    method: 'get',
    path: '/maker/fakeff',
    handler: async (req, res) => {
        try {
            // Mengambil input nama (?name=... atau ?q=...)
            const inputName = req.query?.name || req.query?.q;

            if (!inputName) {
                return res.status(400).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'Parameter nama diperlukan! Contoh: ?name=Rin imup'
                });
            }

            // Memproses generate lobby Free Fire
            const resultData = await generateFF({
                username: String(inputName).trim()
            });

            if (!resultData) {
                throw new Error('Modul gagal menggenerate data Fake FF.');
            }

            // PENTING: Struktur data harus pakai "media" agar gambar lobby muncul di UI dashboard kamu
            res.json({
                status: true,
                creator: "Rin imup",
                data: {
                    type: 'image/png',
                    title: 'Fake Free Fire Lobby',
                    media: [resultData], // Menaruh hasil output modul ke sini agar dirender sebagai gambar
                    description: `Berhasil menggenerate gambar fake lobby Free Fire dengan nama: ${inputName}`
                }
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                creator: "Rin imup",
                message: err.message || 'Terjadi kesalahan internal saat membuat data Fake FF.'
            });
        }
    },
    metadata: {
        category: 'Maker',
        description: 'Membuat gambar tiruan (fake) akun lobby Free Fire berdasarkan nama yang dimasukkan.',
        parameters: [
            {
                name: 'name',
                in: 'query',
                required: true,
                description: 'Nama atau Username FF yang ingin dicantumkan di dalam lobby'
            }
        ],
    }
};
