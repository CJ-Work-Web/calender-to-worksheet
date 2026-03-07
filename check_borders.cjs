const ExcelJS = require('exceljs');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('./public/template.xlsx');
    const ws = workbook.getWorksheet('114.11');

    console.log('Row 4 (Header) border:', JSON.stringify(ws.getCell('A4').border));
    console.log('Row 5 (Data) border:', JSON.stringify(ws.getCell('A5').border));

    // Check footer row 24 border
    console.log('Row 24 (Footer header) A24 border:', JSON.stringify(ws.getCell('A24').border));
    console.log('Row 25 (Footer data) A25 border:', JSON.stringify(ws.getCell('A25').border));

    // Print all merges in the footer area (Row >= 24)
    console.log('Merges:');
    for (const [range, model] of Object.entries(ws._merges)) {
        if (model.top >= 24) {
            console.log(`Merge: ${model.left},${model.top} to ${model.right},${model.bottom}`);
        }
    }
}
check().catch(console.error);
