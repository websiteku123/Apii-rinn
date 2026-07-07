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

            // Memproses generate lobby Free Fire menggunakan modul fake-ff
            const resultData = await generateFF({
                username: String(inputName).trim()
            });

            if (!resultData) {
                throw new Error('Modul gagal menggenerate data Fake FF.');
            }

            // Struktur data JSON menggunakan properti "media" agar muncul di UI Dashboard Maker
            res.json({
                status: true,
                creator: "Rin imup",
                data: {
                    type: 'image/png',
                    title: 'Fake Free Fire Lobby',
                    media: [resultData], // Output dari modul berupa link/buffer otomatis di-render di dashboard
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
                description: 'Nama kamu'
            }
        ],
    }
};
