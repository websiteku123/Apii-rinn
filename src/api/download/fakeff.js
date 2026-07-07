const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const fetch = require('node-fetch');

// Fungsi untuk membersihkan teks agar aman masuk filter drawtext FFmpeg
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

// Fungsi pembantu memastikan folder temp siap digunakan
function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

module.exports = {
    method: 'get',
    path: '/maker/fakeff',
    handler: async (req, res) => {
        // Buat nama file temp yang unik untuk menghindari tabrakan render jika banyak yang pakai barengan
        const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
        const inputLocalPath = path.join(process.cwd(), 'tmp', `ff_in_${uniqueId}.jpg`);
        const outputLocalPath = path.join(process.cwd(), 'tmp', `ff_out_${uniqueId}.jpg`);
        const fontPath = path.join(process.cwd(), 'tmp', 'TeutonNormal.otf');

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

            // REQUEST ACK: Mengacak template otomatis dari angka 1 sampai 17
            const randomNum = Math.floor(Math.random() * 17) + 1;
            const templatePrefixUrl = `https://raw.githubusercontent.com/ryyntwx/pakeff2/refs/heads/main/${randomNum}.jpg`;

            // Pastikan folder tmp ada
            ensureDirectoryExistence(inputLocalPath);

            // 1. Download Gambar Template Random dari GitHub ke Lokal Temp Server
            const imgResponse = await fetch(templatePrefixUrl);
            if (!imgResponse.ok) throw new Error(`Gagal mengunduh template Free Fire nomor ${randomNum} dari GitHub.`);
            const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
            fs.writeFileSync(inputLocalPath, imgBuffer);

            // 2. Proteksi Font: Jika font belum ada di tmp, unduh otomatis atau gunakan fallback terdekat
            if (!fs.existsSync(fontPath)) {
                try {
                    // Mengunduh font TeutonNormal langsung dari repo kamu agar tidak miss
                    const fontResponse = await fetch('https://raw.githubusercontent.com/ryyntwx/pakeff2/refs/heads/main/TeutonNormal.otf');
                    if (fontResponse.ok) {
                        const fontBuffer = Buffer.from(await fontResponse.arrayBuffer());
                        fs.writeFileSync(fontPath, fontBuffer);
                    } else {
                        // Jika tidak ada di repo, buat dummy / lempar error agar kamu tau fontnya kurang
                        throw new Error("Font TeutonNormal.otf tidak ditemukan di server/repo.");
                    }
                } catch (fontErr) {
                    // Jika gagal download font, cek folder root apakah ada backup
                    const backupFont = path.join(process.cwd(), 'TeutonNormal.otf');
                    if (fs.existsSync(backupFont)) {
                        fs.copyFileSync(backupFont, fontPath);
                    } else {
                        throw new Error("Font TeutonNormal.otf wajib ditaruh di root folder atau repo github agar text gradasi metalik bisa ter-render!");
                    }
                }
            }

            // 3. Setup Kalkulasi Logika FFmpeg (Sesuai setelan bot-helper kamu)
            const fontSize = cleanName.length < 8 ? "w*0.046" : cleanName.length <= 15 ? "w*0.047" : "w*0.036";
            const posX = "(w-text_w)/2+38";
            const posY = "h*0.788";

            const fp = escapeDrawtext(fontPath);
            const drawShadow = `drawtext=fontfile=${fp}:text='${cleanName}':x=${posX}+2:y=${posY}+2:fontsize=${fontSize}:fontcolor=black@0.45`;
            const drawWhite  = `drawtext=fontfile=${fp}:text='${cleanName}':x=${posX}:y=${posY}:fontsize=${fontSize}:fontcolor=white`;
            const drawOrange = `drawtext=fontfile=${fp}:text='${cleanName}':x=${posX}:y=${posY}:fontsize=${fontSize}:fontcolor=0xFFCC00`;

            const filterComplex = [
                `[0:v]${drawShadow},${drawWhite}[frameA]`,
                `[0:v]${drawShadow},${drawOrange}[frameB]`,
                `[frameA][frameB]blend=all_expr='A+(B-A)*clip((X-W*0.2)/(W*0.6),0,1)'[out]`
            ].join(";");

            const ffmpegArgs = [
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                inputLocalPath,
                "-filter_complex",
                filterComplex,
                "-map",
                "[out]",
                "-frames:v",
                "1",
                "-q:v",
                "2",
                "-f",
                "image2",
                outputLocalPath,
            ];

            // 4. Jalankan Eksekusi Render FFmpeg Image
            execFile("ffmpeg", ffmpegArgs, { timeout: 15000 }, async (err, _stdout, stderr) => {
                try {
                    if (err || !fs.existsSync(outputLocalPath)) {
                        const detail = String(stderr || err?.message || "unknown ffmpeg error").replace(/\s+/g, " ").trim();
                        console.error("[FFLOBBY API ERR]", detail);
                        
                        return res.status(500).json({
                            status: false,
                            creator: "Rin imup",
                            message: "Ffmpeg gagal merender gambar lobby.",
                            error: detail
                        });
                    }

                    // Baca hasil render jadi buffer gambar mentah
                    const finalBuffer = fs.readFileSync(outputLocalPath);

                    // Atur header response agar browser & bot WhatsApp langsung membacanya sebagai file gambar asli
                    res.setHeader('Content-Type', 'image/jpeg');
                    res.setHeader('X-Template-Used', String(randomNum)); // Info tambahan template ke berapa yang kepake

                    return res.send(finalBuffer);

                } catch (innerErr) {
                    return res.status(500).json({ status: false, creator: "Rin imup", message: innerErr.message });
                } finally {
                    // Bersihkan berkas sampah temporer dari penyimpanan server agar tidak penuh
                    if (fs.existsSync(inputLocalPath)) fs.unlinkSync(inputLocalPath);
                    if (fs.existsSync(outputLocalPath)) fs.unlinkSync(outputLocalPath);
                }
            });

        } catch (err) {
            // Bersihkan file jika terjadi error sebelum ffmpeg jalan
            if (fs.existsSync(inputLocalPath)) fs.unlinkSync(inputLocalPath);
            if (fs.existsSync(outputLocalPath)) fs.unlinkSync(outputLocalPath);

            res.status(500).json({
                status: false,
                creator: "Rin imup",
                message: err.message || 'Terjadi kesalahan internal saat membuat data Fake FF.'
            });
        }
    },
    metadata: {
        category: 'Maker',
        description: 'Membuat gambar lobby custom Free Fire cocok buat bahan untuk jj.',
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
