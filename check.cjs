const ExcelJS = require('exceljs');

async function run() {
    try {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile('./public/template.xlsx');
        const ws = wb.getWorksheet('114.11');

        console.log('R4 A4:', JSON.stringify(ws.getCell('A4').border));
        console.log('R5 A5:', JSON.stringify(ws.getCell('A5').border));
        console.log('R6 A6:', JSON.stringify(ws.getCell('A6').border));
        console.log('R7 A7:', JSON.stringify(ws.getCell('A7').border));
        console.log('R4 C4:', JSON.stringify(ws.getCell('C4').border));
        console.log('R5 C5:', JSON.stringify(ws.getCell('C5').border));
        console.log('R6 C6:', JSON.stringify(ws.getCell('C6').border));
        console.log('R7 C7:', JSON.stringify(ws.getCell('C7').border));

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
