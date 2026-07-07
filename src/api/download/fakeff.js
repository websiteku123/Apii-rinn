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

module.exports = {
    method: 'get',
    path: '/maker/fakeff',
    handler: async (req, res) => {
        // Folder penyimpanan permanen template agar tidak perlu download terus-menerus (Anti-Timeout)
        const lobbyDir = path.join(process.cwd(), 'lobby');
        const tmpDir = path.join(process.cwd(), 'tmp');

        // Pastikan folder lobby dan tmp ada
        if (!fs.existsSync(lobbyDir)) fs.mkdirSync(lobbyDir, { recursive: true });
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
        const outputLocalPath = path.join(tmpDir, `ff_out_${uniqueId}.jpg`);
        const fontPath = path.join(tmpDir, 'TeutonNormal.otf');

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

            // Mengacak template otomatis dari angka 1 sampai 17
            const randomNum = Math.floor(Math.random() * 17) + 1;
            const localTemplatePath = path.join(lobbyDir, `${randomNum}.jpg`);

            // SOLUSI UTAMA: Cek apakah file template sudah ada di lokal folder 'lobby/'
            if (!fs.existsSync(localTemplatePath)) {
                console.log(`[DOWNLOADER] Template ${randomNum}.jpg belum ada di lokal. Mengunduh dari GitHub...`);
                const templatePrefixUrl = `https://raw.githubusercontent.com/ryyntwx/pakeff2/refs/heads/main/${randomNum}.jpg`;
                
                try {
                    // Beri timeout longgar hanya saat download pertama kali
                    const imgResponse = await fetch(templatePrefixUrl, { timeout: 15000 });
                    if (!imgResponse.ok) throw new Error(`Status HTTP ${imgResponse.status}`);
                    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
                    
                    // Simpan permanen ke folder lobby/ agar request berikutnya tinggal pake file lokal
                    fs.writeFileSync(localTemplatePath, imgBuffer);
                    console.log(`[DOWNLOADER] Template ${randomNum}.jpg berhasil disimpan di lokal server.`);
                } catch (downloadErr) {
                    return res.status(504).json({
                        status: false,
                        creator: "Rin imup",
                        message: `Koneksi server ke GitHub Timeout saat mengunduh template ke-${randomNum}. Silahkan coba lagi beberapa saat lagi.`,
                        error: downloadErr.message
                    });
                }
            }

            // Proteksi Font: Jika font belum ada di tmp, unduh otomatis atau ambil dari root
            if (!fs.existsSync(fontPath)) {
                try {
                    const fontResponse = await fetch('https://raw.githubusercontent.com/ryyntwx/pakeff2/refs/heads/main/TeutonNormal.otf', { timeout: 10000 });
                    if (fontResponse.ok) {
                        const fontBuffer = Buffer.from(await fontResponse.arrayBuffer());
                        fs.writeFileSync(fontPath, fontBuffer);
                    } else {
                        const backupFont = path.join(process.cwd(), 'TeutonNormal.otf');
                        if (fs.existsSync(backupFont)) {
                            fs.copyFileSync(backupFont, fontPath);
                        } else {
                            throw new Error("File TeutonNormal.otf tidak ditemukan.");
                        }
                    }
                } catch (fontErr) {
                    // Fallback jika internet ke github mati, coba cari lokal root
                    const backupFont = path.join(process.cwd(), 'TeutonNormal.otf');
                    if (fs.existsSync(backupFont)) {
                        fs.copyFileSync(backupFont, fontPath);
                    } else {
                        return res.status(500).json({
                            status: false,
                            creator: "Rin imup",
                            message: "Gagal memuat font TeutonNormal.otf karena koneksi timeout.",
                            error: fontErr.message
                        });
                    }
                }
            }

            // Setup Kalkulasi Logika FFmpeg 
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
                localTemplatePath, // Membaca langsung file lokal (SUPER CEPAT)
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

            // Jalankan Eksekusi Render FFmpeg Image
            execFile("ffmpeg", ffmpegArgs, { timeout: 30000 }, async (err, _stdout, stderr) => {
                try {
                    if (err || !fs.existsSync(outputLocalPath)) {
                        const detail = String(stderr || err?.message || "unknown ffmpeg error").replace(/\s+/g, " ").trim();
                        console.error("[FFLOBBY API ERR]", detail);
                        
                        return res.status(500).json({
                            status: false,
                            creator: "Rin imup",
                            message: "FFmpeg gagal merender gambar.",
                            error: detail
                        });
                    }

                    const finalBuffer = fs.readFileSync(outputLocalPath);

                    res.setHeader('Content-Type', 'image/jpeg');
                    res.setHeader('X-Template-Used', String(randomNum));
                    res.setHeader('X-Source', 'Local-Cache');

                    return res.send(finalBuffer);

                } catch (innerErr) {
                    return res.status(500).json({ status: false, creator: "Rin imup", message: innerErr.message });
                } finally {
                    // Hapus HANYA file output hasil render temp agar disk tidak penuh
                    if (fs.existsSync(outputLocalPath)) fs.unlinkSync(outputLocalPath);
                }
            });

        } catch (err) {
            if (fs.existsSync(outputLocalPath)) fs.unlinkSync(outputLocalPath);
            res.status(500).json({
                status: false,
                creator: "Rin imup",
                message: err.message || 'Terjadi kesalahan internal.'
            });
        }
    },
    metadata: {
        category: 'Maker',
        description: 'Membuat gambar lobby custom Free Fire dengan teks gradasi metalik tajam otomatis acak dari 17 template HD.',
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
