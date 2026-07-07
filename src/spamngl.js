const crypto = require('crypto');
const fetch = require('node-fetch');

// Fungsi utama penanganan pengiriman spam pesan ke API NGL Link
async function sendSpamMessage(username, message, spamCount) {
    let counter = 0;
    while (counter < spamCount) {
        try {
            const deviceId = crypto.randomBytes(21).toString("hex");
            const url = "https://ngl.link/api/submit";
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
                Accept: "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                Referer: `https://ngl.link/${username}`,
                Origin: "https://ngl.link"
            };
            const body = `username=${username}&question=${encodeURIComponent(message)}&deviceId=${deviceId}&gameSlug=&referrer=`;
            
            const response = await fetch(url, {
                method: "POST",
                headers,
                body,
                mode: "cors",
                credentials: "include"
            });

            if (response.status !== 200) {
                console.log(`[NGL] Ratelimited, tunggu 25 detik...`);
                await new Promise(resolve => setTimeout(resolve, 25000));
            } else {
                counter++;
                console.log(`[NGL] Sent: ${counter}/${spamCount}`);
            }
        } catch (error) {
            console.error(`[NGL] Error:`, error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

module.exports = {
    method: 'get',
    path: '/tools/ngl',
    isApikey: true,
    handler: async (req, res) => {
        try {
            const { username, message, count, apikey } = req.query;

            // Validasi parameter wajib API
            if (!apikey) {
                return res.status(401).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'API Key diperlukan untuk mengakses endpoint ini.'
                });
            }

            if (!username || !message || !count) {
                return res.status(400).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'Parameter diperlukan: ?username=...&message=...&count=...'
                });
            }

            const spamCount = parseInt(count, 10);
            if (isNaN(spamCount) || spamCount <= 0) {
                return res.status(400).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'Jumlah hit (count) harus berupa angka positif.'
                });
            }

            // Batasi maksimum spam jika diperlukan demi keamanan resource server (misal: max 50)
            if (spamCount > 100) {
                return res.status(400).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'Maksimal pengiriman spam dibatasi hingga 100 pesan per request.'
                });
            }

            // Jalankan proses spamming di background agar API tidak terkena gateway timeout
            sendSpamMessage(username, message, spamCount).catch(err => {
                console.error('[NGL Background Processing Error]:', err);
            });

            // Kirim respon sukses instan ke client
            const responseData = {
                status: true,
                creator: "Rin imup",
                data: {
                    target: username,
                    message: message,
                    total_sent: spamCount,
                    status_process: "Pesan sedang dikirim secara bertahap di latar belakang server."
                }
            };

            res.json(responseData);
        } catch (err) {
            res.status(500).json({
                status: false,
                creator: "Rin imup",
                message: err.message || 'Terjadi kesalahan internal saat memproses spam NGL'
            });
        }
    },
    metadata: {
        category: 'Tools',
        description: 'Mengirim spam pesan anonim ke akun NGL Link target secara otomatis.',
        parameters: [
            {
                name: "apikey",
                in: "query",
                required: true,
                description: "Masukkan API Key VIP Anda"
            },
            {
                name: 'username',
                in: 'query',
                required: true,
                description: 'Masukan username ngl (contoh: rin08)'
            },
            {
                name: 'message',
                in: 'query',
                required: true,
                description: 'Isi teks pesan anonim yang ingin dikirimkan'
            },
            {
                name: 'count',
                in: 'query',
                required: true,
                description: 'Jumlah total spam misal 100'
            }
        ],
    }
};
