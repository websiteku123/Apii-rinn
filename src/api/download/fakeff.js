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

// Fungsi pembantu download file di background agar aman dari Gateway Timeout
async function downloadTemplateToLocal(num, targetPath) {
    const url = `https://raw.githubusercontent.com/ryyntwx/pakeff2/refs/heads/main/${num}.jpg`;
    try {
        const response = await fetch(url, { timeout: 10000 });
        if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(targetPath, buffer);
            console.log(`[AUTO-DOWNLOAD] Berhasil mengunduh & menyimpan template ${num}.jpg secara lokal.`);
            return true;
        }
    } catch (err) {
        console.error(`[AUTO-DOWNLOAD ERR] Gagal mengunduh template ${num}.jpg:`, err.message);
    }
    return false;
}

module.exports = {
    method: 'get',
    path: '/maker/fakeff',
    handler: async (req, res) => {
        const lobbyDir = path.join(process.cwd(), 'lobby');
        const tmpDir = path.join(process.cwd(), 'tmp');
        const fontPath = path.join(process.cwd(), 'TeutonNormal.otf');

        // Auto buat folder kalau belum ada
        if (!fs.existsSync(lobbyDir)) fs.mkdirSync(lobbyDir, { recursive: true });
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
        const outputLocalPath = path.join(tmpDir, `ff_out_${uniqueId}.jpg`);

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

            // PROTEKSI FONT UTAMA
            if (!fs.existsSync(fontPath)) {
                // Coba download otomatis font TeutonNormal dari repo jika hilang dari root
                try {
                    const fontRes = await fetch('https://raw.githubusercontent.com/ryyntwx/pakeff2/refs/heads/main/TeutonNormal.otf', { timeout: 5000 });
                    if (fontRes.ok) {
                        fs.writeFileSync(fontPath, Buffer.from(await fontRes.arrayBuffer()));
                    } else {
                        throw new Error();
                    }
                } catch {
                    return res.status(500).json({
                        status: false,
                        creator: "Rin imup",
                        message: "File font 'TeutonNormal.otf' wajib ada di root project kamu!"
                    });
                }
            }

            // Cari template secara acak (1-17)
            let randomNum = Math.floor(Math.random() * 17) + 1;
            let localTemplatePath = path.join(lobbyDir, `${randomNum}.jpg`);

            // JIKA FILE LOKAL BELUM ADA
            if (!fs.existsSync(localTemplatePath)) {
                console.log(`[CACHE MISS] Template ${randomNum}.jpg belum ada di lokal. Mencoba download cepat...`);
                
                // Coba download langsung secara sinkronus dengan limit waktu ketat (max 2.5 detik) agar tidak timeout
                const downloadSuccess = await Promise.race([
                    downloadTemplateToLocal(randomNum, localTemplatePath),
                    new Promise((resolve) => setTimeout(() => resolve(false), 2500))
                ]);

                // Jika download gagal/kelamaan, cari template lokal manapun yang sudah ready biar ga eror timeout
                if (!downloadSuccess || !fs.existsSync(localTemplatePath)) {
                    const files = fs.readdirSync(lobbyDir).filter(f => f.endsWith('.jpg'));
                    
                    if (files.length > 0) {
                        // Pakai file lokal yang sudah ada secara acak
                        const fallbackFile = files[Math.floor(Math.random() * files.length)];
                        randomNum = parseInt(fallbackFile.split('.')[0], 10) || 1;
                        localTemplatePath = path.join(lobbyDir, fallbackFile);
                        console.log(`[FALLBACK CHOSEN] Menggunakan template lokal ready: ${fallbackFile}`);
                    } else {
                        // Jika bener-bener kosong melompong belum ada file 1 pun terdownload
                        // Trigger download di background untuk request berikutnya
                        downloadTemplateToLocal(randomNum, localTemplatePath);
                        
                        return res.status(503).json({
                            status: false,
                            creator: "Rin imup",
                            message: "Server sedang mengunduh & mempersiapkan template dari GitHub untuk pertama kali. Silahkan refresh kembali dalam 5 detik!"
                        });
                    }
                }
            }

            // Pemicu background pre-download: Mengunduh template acak lain secara diam-diam agar folder lokal cepat terisi penuh
            const nextRandom = Math.floor(Math.random() * 17) + 1;
            const nextPath = path.join(lobbyDir, `${nextRandom}.jpg`);
            if (!fs.existsSync(nextPath)) {
                downloadTemplateToLocal(nextRandom, nextPath); // Berjalan di background tanpa menahan respon user
            }

            // 2. Setup Kalkulasi Logika FFmpeg Render
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
                localTemplatePath,
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

            // 3. Jalankan Eksekusi Render FFmpeg Image Murni Lokal
            execFile("ffmpeg", ffmpegArgs, { timeout: 10000 }, async (err, _stdout, stderr) => {
                try {
                    if (err || !fs.existsSync(outputLocalPath)) {
                        const detail = String(stderr || err?.message || "unknown ffmpeg error").replace(/\s+/g, " ").trim();
                        console.error("[FFLOBBY API ERR]", detail);
                        
                        return res.status(500).json({
                            status: false,
                            creator: "Rin imup",
                            message: "FFmpeg gagal merender gambar lobby.",
                            error: detail
                        });
                    }

                    const finalBuffer = fs.readFileSync(outputLocalPath);

                    res.setHeader('Content-Type', 'image/jpeg');
                    res.setHeader('X-Template-Used', String(randomNum));

                    return res.send(finalBuffer);

                } catch (innerErr) {
                    return res.status(500).json({ status: false, creator: "Rin imup", message: innerErr.message });
                } finally {
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
        description: 'Membuat gambar lobby custom Free Fire dengan sistem Smart Background Cache anti-timeout.',
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
            
