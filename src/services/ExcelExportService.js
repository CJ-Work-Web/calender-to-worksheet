import ExcelJS from 'exceljs';
import { CATEGORIES } from './DataProcessorService';

/**
 * 從指定的來源列複製樣式並套用到底下的合併範圍
 */
const copyRowStyleAndMerge = (worksheet, sourceRowNumber, targetRowNumber, sourceTextRowLength) => {
    const sourceRow = worksheet.getRow(sourceRowNumber);
    const targetRow = worksheet.getRow(targetRowNumber);

    targetRow.height = sourceRow.height;

    // B - G 都要套用 B 欄的樣式 (因為範本中 B-G 合併)
    const baseStyle = sourceRow.getCell(2).style;

    // A 欄樣式 (序號)
    targetRow.getCell(1).style = sourceRow.getCell(1).style;

    for (let col = 2; col <= 7; col++) {
        targetRow.getCell(col).style = baseStyle;
    }

    // 將第二欄以後做跨欄合併 B~G
    worksheet.mergeCells(`B${targetRowNumber}:G${targetRowNumber}`);
};

/**
 * 生成單一主任的工作表
 */
const generateManagerSheet = (workbook, templateSheet, managerName, sheetName, data, startDateStr, endDateStr, stationsList) => {
    // 複製範本工作表
    const newSheet = workbook.addWorksheet(sheetName);

    // 套用精準的列寬 (由分析原範本檔得出)
    newSheet.columns = [
        { width: 11.63 }, // A
        { width: 11.63 }, // B
        { width: 13.00 }, // C
        { width: 12.27 }, // D
        { width: 11.63 }, // E
        { width: 15.27 }, // F
        { width: 12.45 }  // G
    ];

    // --- 複製並填寫表頭 (Row 1-3) ---
    // 1. 標題列
    const titleRow = templateSheet.getRow(1);
    const newTitleRow = newSheet.addRow([]);
    newTitleRow.height = titleRow.height || 18; // 保險起見給定預設高度
    for (let c = 1; c <= 7; c++) newTitleRow.getCell(c).style = titleRow.getCell(c).style;
    newSheet.mergeCells(`A1:G1`);

    const yearMatch = startDateStr.match(/^(\d{4})/);
    let twYear = "xxx";
    let initMonth = "xx";
    if (yearMatch) {
        twYear = parseInt(yearMatch[1]) - 1911;
        initMonth = parseInt(startDateStr.split('-')[1]).toString(); // Remove leading zero
    }
    newTitleRow.getCell(1).value = `${twYear}年${initMonth}月份 工作日誌整體執行情形說明表`;

    // 2. 負責案場與主任
    const r2 = templateSheet.getRow(2);
    const newR2 = newSheet.addRow([]);
    newR2.height = r2.height;
    for (let c = 1; c <= 7; c++) newR2.getCell(c).style = r2.getCell(c).style;
    newSheet.mergeCells(`B2:E2`);
    newSheet.getCell('A2').value = "負責案場：";
    newSheet.getCell('B2').value = stationsList.join("、");
    newSheet.getCell('F2').value = "現場主任：";
    // mgr 傳進來原本是 "主任工作內容_許宏毅_03月"，但其實傳入的引數應該直接是名字。
    // 在呼叫的地方 (exportToExcel) 產生 sheetName，但我們這裡 G2 只要名字。
    newSheet.getCell('G2').value = managerName;

    // 3. 執行期間
    const r3 = templateSheet.getRow(3);
    const newR3 = newSheet.addRow([]);
    newR3.height = r3.height;
    for (let c = 1; c <= 7; c++) newR3.getCell(c).style = r3.getCell(c).style;
    newSheet.mergeCells(`B3:G3`);
    newSheet.getCell('A3').value = "執行期間：";

    let twEndYear = "xxx", endMonth = "xx", endDay = "xx";
    const startDay = startDateStr.split('-')[2] ? parseInt(startDateStr.split('-')[2]).toString() : "xx";
    if (endDateStr) {
        twEndYear = parseInt(endDateStr.split('-')[0]) - 1911;
        endMonth = parseInt(endDateStr.split('-')[1]).toString();
        endDay = parseInt(endDateStr.split('-')[2]).toString();
    }
    newSheet.getCell('B3').value = `${twYear}年${initMonth}月${startDay}日至${twEndYear}年${endMonth}月${endDay}日`;


    // --- 填寫七大分類區塊 ---
    // 從範本取得標準樣式：第 4 列為標題，第 5 列為資料
    const getStylesFromTemplate = (titleRowIdx, dataRowIdx) => {
        const tRow = templateSheet.getRow(titleRowIdx);
        const dRow = templateSheet.getRow(dataRowIdx);

        const titleStyles = [];
        const dataStyles = [];
        for (let c = 1; c <= 7; c++) {
            titleStyles.push(tRow.getCell(c).style);
            dataStyles.push(dRow.getCell(c).style);
        }

        return {
            titleHeight: tRow.height,
            titleStyles,
            dataHeight: dRow.height,
            dataStyles
        };
    };

    const stdStyles = getStylesFromTemplate(4, 5);
    let currentRowIdx = 4; // 開始於第 4 列
    const categoryRows = new Set(); // 記錄哪些列是分類標題

    const addCategory = (catName, items) => {
        // 增加標題列
        const catRow = newSheet.addRow([]);
        catRow.height = stdStyles.titleHeight;
        for (let c = 1; c <= 7; c++) catRow.getCell(c).style = stdStyles.titleStyles[c - 1];
        newSheet.mergeCells(`A${currentRowIdx}:G${currentRowIdx}`);
        newSheet.getCell(`A${currentRowIdx}`).value = catName;
        categoryRows.add(currentRowIdx);
        currentRowIdx++;

        if (items.length === 0) {
            // 無資料，增加一行寫「無」
            const emptyRow = newSheet.addRow([]);
            emptyRow.height = stdStyles.dataHeight;
            for (let c = 1; c <= 7; c++) emptyRow.getCell(c).style = stdStyles.dataStyles[c - 1];
            newSheet.mergeCells(`B${currentRowIdx}:G${currentRowIdx}`);
            newSheet.getCell(`B${currentRowIdx}`).value = "無";
            currentRowIdx++;
        } else {
            // 有資料，依序倒出
            items.forEach((item, index) => {
                const dataRow = newSheet.addRow([]);
                dataRow.height = stdStyles.dataHeight;

                dataRow.getCell(1).style = stdStyles.dataStyles[0];
                dataRow.getCell(1).value = index + 1; // 序號

                for (let c = 2; c <= 7; c++) {
                    const tgtCell = dataRow.getCell(c);
                    tgtCell.style = stdStyles.dataStyles[c - 1];
                }

                newSheet.mergeCells(`B${currentRowIdx}:G${currentRowIdx}`);
                newSheet.getCell(`B${currentRowIdx}`).value = item.mergedCol;
                currentRowIdx++;
            });
        }
    };

    // 依序寫入七大類
    addCategory(CATEGORIES.INSPECT, data[CATEGORIES.INSPECT]);
    addCategory(CATEGORIES.HANDOVER, data[CATEGORIES.HANDOVER]);
    addCategory(CATEGORIES.MEETING, data[CATEGORIES.MEETING]);
    addCategory(CATEGORIES.MAINTENANCE, data[CATEGORIES.MAINTENANCE]);
    addCategory(CATEGORIES.PAYMENT, data[CATEGORIES.PAYMENT]);
    addCategory(CATEGORIES.DISPUTE, []);
    addCategory(CATEGORIES.OTHER_TASK, []);

    // --- 完全複製範本表尾 (Row 24 to 30) ---
    const footerStartRow = currentRowIdx;
    for (let i = 24; i <= 30; i++) {
        const srcRow = templateSheet.getRow(i);
        const tgtRow = newSheet.addRow([]);
        tgtRow.height = srcRow.height;
        for (let c = 1; c <= 7; c++) {
            const srcCell = srcRow.getCell(c);
            const tgtCell = tgtRow.getCell(c);
            tgtCell.style = { ...srcCell.style }; // 淺拷貝以避免污染共用樣式
            tgtCell.value = srcCell.value;
        }
        currentRowIdx++;
    }

    // 重建簽名列 (對應原始 Row 24) 的表頭合併儲存格
    newSheet.mergeCells(`A${footerStartRow}:B${footerStartRow}`);
    newSheet.mergeCells(`C${footerStartRow}:E${footerStartRow}`);
    newSheet.mergeCells(`F${footerStartRow}:G${footerStartRow}`);

    // --- 第二遍：應用精準的格線邏輯 ---
    // 依據規則：大外框粗框、標題列上下細框、其餘資料列與蓋章區皆無內部格線。
    const dataStartRow = 4;
    const dataEndRow = footerStartRow - 1;
    const finalRow = currentRowIdx - 1;

    for (let r = dataStartRow; r <= finalRow; r++) {
        const isCat = categoryRows.has(r);

        for (let c = 1; c <= 7; c++) {
            const cell = newSheet.getCell(r, c);
            const border = {};

            // 1. 左右大外圍必定為 medium
            if (c === 1) border.left = { style: 'medium' };
            if (c === 7) border.right = { style: 'medium' };

            // 2. 資料區段的上下粗黑框
            if (r === dataStartRow) border.top = { style: 'medium' };
            if (r === dataEndRow) border.bottom = { style: 'medium' };

            // 3. 蓋章區段的上下粗黑框
            if (r === footerStartRow) border.top = { style: 'medium' };
            if (r === finalRow) border.bottom = { style: 'medium' };

            // 4. 如果是資料區的標題列，補齊內部上下細框 (thin)
            if (isCat) {
                if (!border.top) border.top = { style: 'thin' };
                if (!border.bottom) border.bottom = { style: 'thin' };
            }

            // 5. 套用全新的邊框，徹底覆蓋掉隱含的共用變數污染
            cell.style = { ...cell.style, border: border };
        }
    }
};


/**
 * 匯出為 Excel 檔案
 * @param {Object} categorizedData - 經 DataProcessorService 分類後的資料 (7大類形式)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {Array} originalMapping - STATION_MANAGER_MAPPING 清冊
 */
export const exportToExcel = async (categorizedData, startDate, endDate, originalMapping) => {
    try {
        // 1. 下載 public/template.xlsx 成為 ArrayBuffer
        const response = await fetch('./template.xlsx');
        if (!response.ok) {
            throw new Error(`無法載入範本檔: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();

        // 2. 透過 exceljs 載入
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        // 預設的範本 Sheet
        const templateSheet = workbook.worksheets[0];

        // 紀錄下原始的 Sheet IDs，等複製完之後全數刪除
        const originalSheetIds = workbook.worksheets.map(ws => ws.id);

        // 3. 取得所有主任名稱 (排除"未匹配站點"來計算站點清單，後面再把 "未匹配站點" 獨立跑)
        const allManagers = Object.keys(categorizedData);

        for (const mgr of allManagers) {
            // 整理該主任負責的所有站點
            let stationsForMgr = [];
            if (mgr !== "未匹配站點") {
                stationsForMgr = originalMapping
                    .filter(m => m.manager === mgr)
                    .map(m => m.station);

                // 去重複，如果同一個主任負責同一個站的多個部分
                stationsForMgr = [...new Set(stationsForMgr)];
            } else {
                stationsForMgr = ["無"];
            }

            // 產生這個主任專屬的工作表
            // 將 sheetname 改為 "主任工作內容_主任姓名_月份" 的形式
            let mStr = startDate.split('-')[1]; // 保留原樣或轉數字
            const sheetName = mgr === "未匹配站點" ? "未匹配站點" : `主任工作內容_${mgr}_${parseInt(mStr).toString()}月`;

            // 傳遞 mgr 作為真正的 manager 名字
            generateManagerSheet(workbook, templateSheet, mgr, sheetName, categorizedData[mgr], startDate, endDate, stationsForMgr);
        }

        // 4. 刪除所有原來的範本 Sheets (例如 114.07, 114.08 這些隱藏的)
        originalSheetIds.forEach(id => {
            workbook.removeWorksheet(id);
        });

        // 5. 輸出 Blob 並觸發下載
        const outBuffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // 檔名: "xxx年x月_主任工作日誌"
        let twYear = "xxx", initMonth = "x";
        if (startDate) {
            twYear = parseInt(startDate.split('-')[0]) - 1911;
            initMonth = parseInt(startDate.split('-')[1]).toString(); // 去掉開頭 0
        }
        const fileName = `${twYear}年${initMonth}月_主任工作日誌.xlsx`;

        // 下載邏輯
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Excel 產生失敗:", error);
        throw error;
    }
};
