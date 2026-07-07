const generateFF = require('fake-ff');

module.exports = {
    method: 'get',
    path: '/maker/fakeff',
    handler: async (req, res) => {
        try {
            const inputName = req.query?.name || req.query?.q;

            if (!inputName) {
                return res.status(400).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'Parameter nama diperlukan! Contoh: ?name=Rin imup'
                });
            }

            // Memproses generate lobby Free Fire (Output berupa Buffer)
            const resultData = await generateFF({
                username: String(inputName).trim()
            });

            if (!resultData) {
                throw new Error('Modul gagal menggenerate data Fake FF.');
            }

            // FIX UTAMA: Atur header respons agar dikenali sebagai file gambar langsung
            res.setHeader('Content-Type', 'image/png');

            // Kirim langsung buffer gambar mentah secara instan tanpa dibungkus JSON
            return res.send(resultData);

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
        description: 'Membuat gambar tiruan (fake) akun lobby Free Fire langsung dalam format gambar PNG.',
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
