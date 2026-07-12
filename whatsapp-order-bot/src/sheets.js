const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Orders';

let sheetsClientPromise;

function getSheetsClient() {
  if (!sheetsClientPromise) {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsClientPromise = auth.getClient().then((client) => google.sheets({ version: 'v4', auth: client }));
  }
  return sheetsClientPromise;
}

async function appendOrderRow(order) {
  if (!SPREADSHEET_ID) {
    console.warn('SPREADSHEET_ID not set — skipping Google Sheets write. Message was:', order.rawMessage);
    return;
  }
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:H`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        order.timestamp,
        order.phone,
        order.senderName,
        order.rawMessage,
        order.customerName,
        order.product,
        order.quantity,
        order.area,
      ]],
    },
  });
}

module.exports = { appendOrderRow };
