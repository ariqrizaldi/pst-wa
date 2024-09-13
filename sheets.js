const { google } = require('googleapis');
const fs = require('fs');
const key = require('./credentials.json');
const auth = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);
const spreadsheetId = '1dRbs1j2kvP4vs1tZSEIqwQpCIkevmIc2bSnIuOT80o8';
const range = 'pelayanan';

auth.authorize((err) => {
    if (err) {
        console.error('Gagal mengautentikasi ke Google Sheets API', err);
        return;
    }
    console.log('Berhasil mengautentikasi ke Google Sheets API');
});

const sheets = google.sheets({ version: 'v4', auth });

const getDataFromSheet = async (spreadsheetId, range) => {
    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        return response.data.values;
    } catch (err) {
        console.error(`Gagal mendapatkan data dari Google Sheets: ${err}`);
        throw err;
    }
};

const writeToSpreadsheet = async (values) => {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                majorDimension: "ROWS",
                values: values
            }
        });
        console.log('Data berhasil ditulis ke Google Sheets');
    } catch (err) {
        console.error('Gagal menulis data ke Google Sheets', err);
    }
};

const updateDataInSheet = async (id, value) => {
    try {
        const dataToUpdate = [{ id, kolom: 7, nilai: value }];
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        const values = response.data.values;

        if (values) {
            for (const update of dataToUpdate) {
                const { id, kolom, nilai } = update;
                for (let i = 0; i < values.length; i++) {
                    if (values[i][0] === id) {
                        values[i][kolom] = nilai;
                    }
                }
            }

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: { values },
            });

            console.log('Data telah diupdate');
        } else {
            console.log('Data tidak ditemukan.');
        }
    } catch (err) {
        console.error(`Gagal mengupdate data di Google Sheets: ${err}`);
    }
};

const getTemplate = async () => {
    try {
        const dataArray = await getDataFromSheet(spreadsheetId, 'template_pesan');
        saveJsonToFile(dataArray, 'data.json');
    } catch (err) {
        console.error(`Gagal mendapatkan template pesan: ${err}`);
    }
};

const getPetugas = async () => {
    try {
        const dataArray = await getDataFromSheet(spreadsheetId, 'petugas');
        saveJsonToFile(dataArray, 'petugas.json');
    } catch (err) {
        console.error(`Gagal mendapatkan data petugas: ${err}`);
    }
};

const saveJsonToFile = (dataArray, fileName) => {
    const header = dataArray[0];
    const data = dataArray.slice(1).map(row => {
        const obj = {};
        header.forEach((key, index) => {
            obj[key] = row[index];
        });
        return obj;
    });

    fs.writeFile(fileName, JSON.stringify(data), 'utf8', (err) => {
        if (err) {
            console.error(`Gagal menyimpan data JSON ke file "${fileName}":`, err);
        } else {
            console.log(`Data JSON telah berhasil disimpan ke file "${fileName}".`);
        }
    });
};

module.exports = {
    writeToSpreadsheet,
    getDataFromSheet,
    updateDataInSheet,
    getPetugas,
    getTemplate
};