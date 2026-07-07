const generateFF = require('fake-ff');

module.exports = {
    method: 'get',
    path: '/maker/fakeff',
    // Tanpa apikey sesuai struktur default jika tidak diminta
    handler: async (req, res) => {
        try {
            // Mengambil input nama dari query parameter (mendukung ?name=... atau ?q=...)
            const inputName = req.query?.name || req.query?.q;

            if (!inputName) {
                return res.status(400).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'Parameter nama diperlukan! Contoh: ?name=Rin imup'
                });
            }

            // Memproses generate data lobby Free Fire menggunakan modul fake-ff
            const resultData = await generateFF({
                username: String(inputName).trim()
            });

            // Memastikan data berhasil digenerate oleh modul
            if (!resultData) {
                throw new Error('Modul gagal menggenerate data Fake FF.');
            }

            // Mengembalikan output response JSON rapi untuk UI Dashboard
            res.json({
                status: true,
                creator: "Rin imup",
                data: {
                    title: 'Fake Free Fire Lobby Generator',
                    username: inputName,
                    result: resultData,
                    message: 'Berhasil buat fake ff.'
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
        description: 'Membuat maker fake ff dengan loby rendom cocok untuk bahan JJ.',
        parameters: [
            {
                name: 'name',
                in: 'query',
                required: true,
                description: 'Masukan nama.'
            }
        ],
    }
};
