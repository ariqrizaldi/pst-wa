const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { Boom } = require('@hapi/boom');
const { writeToSpreadsheet, updateDataInSheet, getPetugas, getTemplate } = require('./sheets.js');
const fs = require('fs');

// Membaca data dari file JSON
const pesan = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const petugas = JSON.parse(fs.readFileSync('petugas.json', 'utf8'));

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on('connection.update', update => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = new Boom(lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus karena ', lastDisconnect.error, ', mencoba untuk menyambung kembali ', shouldReconnect);
            if (shouldReconnect) {
                startSock();
            }
        } else if (connection === 'open') {
            console.log('Koneksi terbuka');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on("messages.upsert", async m => {
        const message = m.messages[0];
        const kataKunci = "Mohon tuliskan";

        const teksPesan = await cekPesan(message);
        if (m.type === 'notify' && teksPesan.includes(kataKunci)) {
            const hasil = await splitTeks(teksPesan);
            if (Object.keys(hasil).length > 0) {
                const values = createValues(message, hasil);
                const jid = message.key.remoteJid;
                await Promise.all([
                    writeToSpreadsheet(values),
                    console.log(`${getPetugasHariIni(petugas).no_wa}@s.whatsapp.net`),
                    console.log(jid),
                    sock.sendMessage(jid, { text: 'Mohon menunggu, permintaan Anda akan dibalas segera oleh Petugas kami dalam waktu kurang dari 1x24 Jam ' }),
                    sock.sendMessage('120363332565581691@g.us', { text: formatTeks(values) }),
                    sock.sendMessage(`${getPetugasHariIni(petugas).no_wa}@s.whatsapp.net`, { text: formatTeks(values) })
                ]);
            }
        } else if (m.type === 'notify' && teksPesan.startsWith('Update')) {
            const hasil = await splitTeks(teksPesan);
            const id = teksPesan.split('\n')[0].split('#')[1].trim();
            if (Object.keys(hasil).length > 0) {
                const status = hasil['Status'] || '';
                await updateDataInSheet(id, status);
            }
        } else if (m.type === 'notify') {
            for (const key of pesan) {
                if (teksPesan.includes(key.pesan)) {
                    await sock.sendMessage(message.key.remoteJid, { text: key.balasan });
                    break;
                }
            }
        }
    });
}

function createValues(message, hasil) {
    const nama = hasil['Nama'] || '';
    const instansi = hasil['Instansi'] || '';
    const keperluan = hasil['Keperluan'] || '';
    const noWhatsapp = hasil['No WhatsApp'] || message.key.remoteJid.split('@')[0];
    const tgl = hasil['Tanggal'] || getFormattedDate();
    const status = hasil['Status'] || 'Dalam Proses';
    const media = hasil['Media'] || 'WhatsApp';
    return [[uniqueId(), message.key.id, noWhatsapp, nama, instansi, keperluan, tgl, status, media]];
}

function formatTeks(values) {
    return `Ada Permintaan Layanan\n#Id ${values[0][0]}\nTanggal masuk: ${values[0][6]}\n\nNama: ${values[0][3]}\nInstansi: ${values[0][4]}\nKeperluan: ${values[0][5]}\nStatus: ${values[0][7]}`;
}
function getPetugasHariIni(petugas) {

    // Mendapatkan tanggal hari ini
    const today = new Date();
    const tanggalHariIni = today.getDate().toString(); // Mengambil tanggal dalam bentuk string

    // Mencari petugas berdasarkan tanggal
    const petugasHariIni = petugas.find(petugas => petugas.tanggal_tugas === tanggalHariIni);
    
    // Mengembalikan hasil dalam bentuk object
    if (petugasHariIni) {
        return {
            nama_petugas: petugasHariIni.nama_petugas,
            no_wa: petugasHariIni.no_wa
        };
    } else {
        return null; // Jika tidak ada petugas untuk tanggal tersebut
    }
}
function splitTeks(teks) {
    const hasil = {};
    teks.split('\n').forEach(line => {
        if (line.includes(':')) {
            const [kunci, nilai] = line.split(':');
            if (kunci && nilai) {
                hasil[kunci.trim()] = nilai.trim();
            }
        }
    });
    return hasil;
}

function cekPesan(message) {
    return message.message?.extendedTextMessage?.text || message.message?.conversation || '';
}

function getFormattedDate() {
    const hari = new Date();
    return hari.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function uniqueId() {
    return `A${new Date().getTime()}${Math.floor(Math.random() * 20)}`;
}

getTemplate();
getPetugas();
startSock();