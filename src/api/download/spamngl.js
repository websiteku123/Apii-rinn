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
            // Menyelaraskan penangkapan parameter input agar dideteksi sistem UI dashboard
            const username = req.query?.username || req.body?.username || req.query?.q || req.body?.q;
            const message = req.query?.message || req.body?.message;
            const count = req.query?.count || req.body?.count;
            const apikey = req.query?.apikey || req.body?.apikey;

            // Validasi API Key
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

            // Proses berjalan di background agar server tidak timeout/gantung saat looping
            sendSpamMessage(username, message, spamCount).catch(err => {
                console.error('[NGL Background Error]:', err);
            });

            // Format data response disamakan dengan struktur standar dashboard mu wok
            res.json({
                status: true,
                creator: "Rin imup",
                data: {
                    target: username,
                    message: message,
                    total_request: spamCount,
                    status_process: "Pesan sedang dikirim secara bertahap di latar belakang server.",
                    message_status: 'Proses pemrosesan NGL selesai dilakukan'
                }
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                creator: "Rin imup",
                message: err.message || 'Terjadi kesalahan saat memproses permintaan'
            });
        }
    },
    metadata: {
        category: "Tools",
        description: "Mengirim pesan anonim ke akun NGL Link target secara otomatis melalui endpoint API",
        parameters: [
            {
                name: "username",
                in: "query",
                required: true,
                description: "Username target ngl"
            },
            {
                name: "message",
                in: "query",
                required: true,
                description: "Isi teks pesan anonim"
            },
            {
                name: "count",
                in: "query",
                required: true,
                description: "Jumlah total pesan"
            },
            {
                name: "apikey",
                in: "query",
                required: true,
                description: "Masukkan API Key VIP Anda"
            }
        ]
    }
};
