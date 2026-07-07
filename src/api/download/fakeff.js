  const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const FONT_URL = 'https://raw.githubusercontent.com/ryyntwx/pakeff2/refs/heads/main/TeutonNormal.otf';
const TEMPLATE_BASE_URL = 'https://raw.githubusercontent.com/ryyntwx/pakeff2/refs/heads/main/';

async function downloadFile(url, targetPath) {
    try {
        const response = await fetch(url, { timeout: 15000 });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(targetPath, buffer);
        return true;
    } catch (err) {
        console.error(`[DOWNLOAD ERROR] ${url}:`, err.message);
        return false;
    }
}

function escapeDrawtext(value = "") {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/:/g, "\\:")
        .replace(/'/g, "\\\\'")
        .replace(/,/g, "\\,")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/%/g, "\\%")
        .replace(/[<>|&;$\r\n]/g, " ")
        .trim();
}

function wrapText(ctx, text, maxWidth, fontSize) {
    ctx.font = `${fontSize}px TeutonNormal`;
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const word of words) {
        const test = cur ? cur + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && cur) {
            lines.push(cur);
            cur = word;
        } else {
            cur = test;
        }
    }
    if (cur) lines.push(cur);
    return lines;
}

module.exports = {
    method: 'get',
    path: '/maker/fakeff',
    handler: async (req, res) => {
        const lobbyDir = path.join(process.cwd(), 'lobby');
        const fontPath = path.join(process.cwd(), 'TeutonNormal.otf');

        if (!fs.existsSync(lobbyDir)) fs.mkdirSync(lobbyDir, { recursive: true });

        try {
            const inputName = req.query?.name || req.query?.q;

            if (!inputName) {
                return res.status(400).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'Parameter nama diperlukan! Contoh: ?name=Rin Store'
                });
            }

            const cleanName = escapeDrawtext(inputName);
            if (!cleanName) {
                return res.status(400).json({
                    status: false,
                    creator: "Rin imup",
                    message: 'Nama tidak boleh kosong atau berisi karakter ilegal.'
                });
            }

            if (!fs.existsSync(fontPath)) {
                console.log('[FONT] Mengunduh font TeutonNormal.otf...');
                const success = await downloadFile(FONT_URL, fontPath);
                if (!success) {
                    return res.status(500).json({
                        status: false,
                        creator: "Rin imup",
                        message: "Gagal mengunduh font. Pastikan koneksi internet stabil."
                    });
                }
            }

            try {
                GlobalFonts.registerFromPath(fontPath, 'TeutonNormal');
            } catch (err) {
                return res.status(500).json({
                    status: false,
                    creator: "Rin imup",
                    message: "Gagal memuat font: " + err.message
                });
            }

            let randomNum = Math.floor(Math.random() * 17) + 1;
            let localTemplatePath = path.join(lobbyDir, `${randomNum}.jpg`);

            if (!fs.existsSync(localTemplatePath)) {
                console.log(`[TEMPLATE] Mengunduh ${randomNum}.jpg...`);
                const success = await downloadFile(`${TEMPLATE_BASE_URL}${randomNum}.jpg`, localTemplatePath);
                
                if (!success) {
                    const files = fs.readdirSync(lobbyDir).filter(f => f.endsWith('.jpg'));
                    if (files.length > 0) {
                        const fallbackFile = files[Math.floor(Math.random() * files.length)];
                        randomNum = parseInt(fallbackFile.split('.')[0], 10) || 1;
                        localTemplatePath = path.join(lobbyDir, fallbackFile);
                        console.log(`[FALLBACK] Pakai template: ${fallbackFile}`);
                    } else {
                        return res.status(503).json({
                            status: false,
                            creator: "Rin imup",
                            message: "Server sedang mengunduh template. Silahkan coba lagi dalam 5 detik!"
                        });
                    }
                }
            }

            const nextRandom = Math.floor(Math.random() * 17) + 1;
            const nextPath = path.join(lobbyDir, `${nextRandom}.jpg`);
            if (!fs.existsSync(nextPath)) {
                downloadFile(`${TEMPLATE_BASE_URL}${nextRandom}.jpg`, nextPath);
            }

            const templateImage = await loadImage(localTemplatePath);
            const canvas = createCanvas(templateImage.width, templateImage.height);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

            const fontSize = cleanName.length < 8 ? canvas.width * 0.046 : cleanName.length <= 15 ? canvas.width * 0.047 : canvas.width * 0.036;
            const posX = (canvas.width - ctx.measureText(cleanName).width) / 2 + 38;
            const posY = canvas.height * 0.788;

            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.font = `${fontSize}px TeutonNormal`;

            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillText(cleanName, posX, posY);

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(cleanName, posX, posY);

            ctx.fillStyle = '#FFCC00';
            ctx.fillText(cleanName, posX, posY);

            const buffer = canvas.toBuffer('image/jpeg', { quality: 85 });

            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('X-Template-Used', String(randomNum));
            return res.send(buffer);

        } catch (err) {
            console.error('[ERROR]', err);
            res.status(500).json({
                status: false,
                creator: "Rin imup",
                message: err.message || 'Terjadi kesalahan internal.'
            });
        }
    },
    metadata: {
        category: 'Maker',
        description: 'Membuat gambar lobby custom Free Fire dengan kualitas hd cocok buat bahan jj.',
        parameters: [
            {
                name: 'name',
                in: 'query',
                required: true,
                description: 'Nama atau nickname yang ingin ditempel pada lobby Free Fire'
            }
        ],
    }
};              
