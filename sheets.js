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

const getDataFromSheet = async (spreadsheetId, range) => {
  auth.authorize((err) => {
      if (err) {
        console.error('Gagal mengautentikasi ke Google Sheets API', err);
        return;
      }
      console.log('Berhasil mengautentikasi ke Google Sheets API');
    });
  const sheets = google.sheets({ version: 'v4', auth: auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: range,
  });
  const values = response.data.values;
  return values;
};
const writeToSpreadsheet = async (values) =>  {
  auth.authorize((err) => {
      if (err) {
        console.error('Gagal mengautentikasi ke Google Sheets API', err);
        return;
      }
      console.log('Berhasil mengautentikasi ke Google Sheets API');
    });
  const sheets = google.sheets({ version: 'v4', auth: auth });
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource:{
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
  auth.authorize((err) => {
      if (err) {
        console.error('Gagal mengautentikasi ke Google Sheets API', err);
        return;
      }
      console.log('Berhasil mengautentikasi ke Google Sheets API');
    });
  const sheets = google.sheets({ version: 'v4', auth: auth });
  const dataToUpdate = [
    { id: id, kolom: 7, nilai: value },
  ];
  // Dapatkan data dari Google Sheets
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const values = response.data.values;
  if (values) {
    for (const update of dataToUpdate) {
      const { id, kolom, nilai } = update;
      
      for (let i = 0; i < values.length; i++) {
        if (values[i][0] === id) {
          // ID sesuai, maka update kolom yang diperlukan
          values[i][kolom] = nilai;
        }
      }
    }

    // Kirim kembali data yang telah diupdate ke Google Sheets
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    });

    console.log('Data telah diupdate:', updateResponse.data);
  } else {
    console.log('Data tidak ditemukan.');
  }
};
  // Simpan data JSON ke dalam file
const getTemplate = async () =>  {
  const dataArray = await getDataFromSheet(spreadsheetId,'template_pesan');
  const header = dataArray[0];
const data = dataArray.slice(1).map(data => {
  const obj = {};
  header.forEach((key, index) => {
    obj[key] = data[index];
  });
  return obj;
});
const jsonData = JSON.stringify(data);
// Simpan data JSON ke dalam file
fs.writeFile('data.json', jsonData, 'utf8', (err) => {
  if (err) {
    console.error('Gagal menyimpan data JSON ke file:', err);
  } else {
    console.log('Data JSON telah berhasil disimpan ke file "data.json".');
  }
});

};
const getPetugas = async () =>  {
  const dataArray = await getDataFromSheet(spreadsheetId,'petugas');
  const header = dataArray[0];
const data = dataArray.slice(1).map(data => {
  const obj = {};
  header.forEach((key, index) => {
    obj[key] = data[index];
  });
  return obj;
});
const jsonData = JSON.stringify(data);
// Simpan data JSON ke dalam file
fs.writeFile('petugas.json', jsonData, 'utf8', (err) => {
  if (err) {
    console.error('Gagal menyimpan data JSON ke file:', err);
  } else {
    console.log('Data JSON telah berhasil disimpan ke file "petugas.json".');
  }
});
};
module.exports = {
  writeToSpreadsheet, getDataFromSheet, updateDataInSheet, getPetugas, getTemplate
};
