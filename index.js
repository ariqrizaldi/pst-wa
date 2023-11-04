const { DisconnectReason, useMultiFileAuthState} = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { Boom } = require('@hapi/boom');
const { writeToSpreadsheet, updateDataInSheet, getPetugas, getTemplate }= require('./sheets.js');
const fs = require('fs');

// Membaca data dari file JSON
const pesan = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const petugas = JSON.parse(fs.readFileSync('petugas.json', 'utf8'));
async function startSock () {
    const { state, saveCreds } = await useMultiFileAuthState('sessions');
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state
    });
    sock.ev.on('connection.update', update => {
        const {connection, lastDisconnect} = update;

        if (connection === 'close'){
            const connectAgain = new Boom(lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', connectAgain)
            if (connectAgain) {
                startSock();
            } else if(connection === 'open') {
                console.log('opened connection')
            }
        }

    });
    sock.ev.on ('creds.update', saveCreds);
    sock.ev.on("messages.upsert", async m => {
        const message = m.messages[0];
        const kataKunci = "Media Pelayanan BPS";
        const teksPesan = message.message.conversation === null ? '':message.message.conversation;;
        if (m.type === 'notify' && teksPesan.includes(kataKunci)){
            console.log("got messages", JSON.stringify(message));
            const hasil = await splitTeks(teksPesan);
            if (Object.keys(hasil).length > 0){
                const nama = hasil.hasOwnProperty('Nama')? hasil['Nama']:'';
                const instansi = hasil.hasOwnProperty('Instansi')? hasil['Instansi']:'';
                const keperluan = hasil.hasOwnProperty('Keperluan')? hasil['Keperluan']:'';
                const values = [[uniqueId(), message.key.id, message.key.remoteJid.split('@')[0], nama, instansi, keperluan, tanggal(), 'Dalam Proses']];
                const teks = `Ada Permintaan Layanan\n#Id ${values[0][0]}\nTanggal masuk : ${values[0][6]}\n\nNama : ${values[0][3]}\nInstansi : ${values[0][4]}\nKeperluan : ${values[0][5]}\nStatus : ${values[0][7]}`;
                await writeToSpreadsheet(values);
                await sock.sendMessage('120363026696537412@g.us', { text:  teks});
            }
            
        } else if(m.type === 'notify'){
          for (const key of pesan) {
            if (teksPesan.includes(key.pesan)) {
                await sock.sendMessage(message.key.remoteJid, { text: key.balasan });
                break; // Keluar dari loop jika pesan cocok
              
            }
          }
        }
      });
};
function splitTeks(teks) {
    const hasil = {};
    const baris = teks.split('\n');
      // Iterasi melalui setiap baris dan memisahkan "kunci" dan "nilai"
      for (const line of baris) {
        if (line.includes(':')) {
          const [kunci, nilai] = line.split(':'); // Perhatikan spasi setelah ":"
          if (kunci && nilai) {
            hasil[kunci.trim()] = nilai.trim();
          }
        }
      }
    return hasil;
  };
function tanggal(){
    const hari = new Date();
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const tanggal= hari.toLocaleDateString('id-ID', options);
    return tanggal;
}
function hari(){
  const days = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu"
  ];
  
  const date = new Date();
  const day = days[date.getDay()];
  return day;
}
function uniqueId(){
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 20); // Nomor acak antara 0 dan 999
    const uniqueId = `A${timestamp}${random}`;
    return uniqueId;
}
getTemplate();
getPetugas();
startSock();