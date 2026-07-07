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

            // Memproses generate lobby Free Fire
            const resultData = await generateFF({
                username: String(inputName).trim()
            });

            if (!resultData) {
                throw new Error('Modul gagal menggenerate data Fake FF.');
            }

            // FIX UTAMA: Mengubah output Base64 dari modul menjadi Buffer biner asli
            let imageBuffer;
            if (typeof resultData === 'string') {
                // Jika modul mengembalikan string base64 yang mengandung header data:image
                const base64Data = resultData.replace(/^data:image\/\w+;base64,/, "");
                imageBuffer = Buffer.from(base64Data, 'base64');
            } else if (Buffer.isBuffer(resultData)) {
                // Jika ternyata sudah berupa buffer (untuk amannya tetap dijaga)
                imageBuffer = resultData;
            } else {
                throw new Error('Format data yang dikembalikan modul tidak dikenali.');
            }

            // Atur header respons agar dikenali sebagai file gambar langsung oleh browser & middleware index.js
            res.setHeader('Content-Type', 'image/png');

            // Kirim buffer gambar mentah yang valid
            return res.send(imageBuffer);

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
        description: 'Membuat gambar fake loby ff dengan kualitas hd dan cocok buat jj.',
        parameters: [
            {
                name: 'name',
                in: 'query',
                required: true,
                description: 'Nama lu pea isi'
            }
        ],
    }
};
