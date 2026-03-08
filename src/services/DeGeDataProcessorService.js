import ExcelJS from 'exceljs';
import { categorizeByManager, STATION_MANAGER_MAPPING } from './DataProcessorService';
import { exportSingleDeGeExcel } from './ExcelExportService';

export const processDeGeExcel = async (file) => {
    try {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0]; // Assume first sheet is the one to use

        // 1. 擷取第一列的時間資料
        let reportTitle = worksheet.getCell('A1').text || worksheet.getCell('B1').text || "";
        let timeData = ""; // 例如 "114年03月"
        const titleMatch = reportTitle.match(/(\d{3}年\d{1,2}月)/);
        if (titleMatch) {
            timeData = titleMatch[1];
        }

        // 2. 擷取第二列的現場主任姓名
        let managerName = "";
        for (let c = 1; c <= 10; c++) {
            let val = worksheet.getCell(2, c).text;
            if (val && val.includes("現場主任")) {
                if (val === "現場主任：" || val === "現場主任") {
                    managerName = worksheet.getCell(2, c + 1).text;
                    break;
                } else {
                    managerName = val.replace("現場主任：", "").replace("現場主任", "").replace(":", "").trim();
                    break;
                }
            }
        }
        if (!managerName) managerName = "未知主任";

        // 對應負責案場
        let matchingStations = STATION_MANAGER_MAPPING.filter(m => m.manager === managerName).map(m => m.station);
        let stationsList = [...new Set(matchingStations)];
        let stationsStr = stationsList.length > 0 ? stationsList.join("、") : "無";

        // 3. 擷取第三列的執行期間
        let periodStr = "";
        for (let c = 1; c <= 10; c++) {
            let val = worksheet.getCell(3, c).text;
            if (val && val.includes("執行期間")) {
                if (val === "執行期間：" || val === "執行期間") {
                    periodStr = worksheet.getCell(3, c + 1).text;
                    break;
                } else {
                    periodStr = val.replace("執行期間：", "").replace("執行期間", "").replace(":", "").trim();
                    break;
                }
            }
        }

        // 4. 擷取行程清單並清洗
        let events = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber < 4) return; // 跳過前三列表頭

            let rowText = "";
            row.eachCell((cell, colNumber) => {
                if (colNumber >= 2 && cell.text && cell.text !== "無") {
                    if (!rowText) rowText = cell.text;
                }
            });

            if (!rowText || rowText === "無" || rowText.length < 5) return;

            // 如果該行以月份日期開頭，則視為一筆行程
            if (/^\d{1,2}月\d{1,2}日/.test(rowText)) {
                let cleanText = rowText;

                // 移除空格 (包括全形半形)
                cleanText = cleanText.replace(/\s+/g, "").replace(/　/g, "");

                // 移除特定文字
                const wordsToRemove = ["契約外修繕項目", "契約內修繕項目", "屬契約內修繕項目", "屬契約外修繕項目", "支援"];
                wordsToRemove.forEach(w => {
                    cleanText = cleanText.split(w).join("");
                });

                // 檢查日期後方是否為 `，`，若沒有則補上
                const dateMatch = cleanText.match(/^(\d{1,2}月\d{1,2}日)(.*?)$/);
                if (dateMatch) {
                    let datePart = dateMatch[1];
                    let restPart = dateMatch[2];

                    if (!restPart.startsWith('，') && !restPart.startsWith(',')) {
                        restPart = '，' + restPart;
                    }
                    if (restPart.startsWith(',')) {
                        restPart = '，' + restPart.substring(1);
                    }
                    cleanText = datePart + restPart;
                }

                // 會議行程處理與結尾句號處理
                // 先把重複的句號清掉，避免影響判斷
                cleanText = cleanText.replace(/[。\.]$/, '');

                if (cleanText.includes("會")) {
                    if (!cleanText.includes("無與機關有關重要議題")) {
                        cleanText += "，無與機關有關重要議題。";
                    } else {
                        cleanText += "。";
                    }
                } else {
                    cleanText += "。";
                }

                // 移除重複標點符號 (，， 等)
                cleanText = cleanText.replace(/，，+/g, "，").replace(/。。+/g, "。");

                // 為了 categorizeByManager 能正常運作，提供假的 sortDate，以避免排序錯亂
                let sortDate = 0;
                let mmMatch = cleanText.match(/^(\d{1,2})月(\d{1,2})日/);
                if (mmMatch) {
                    // 使用當前年份補齊
                    const d = new Date(new Date().getFullYear(), parseInt(mmMatch[1]) - 1, parseInt(mmMatch[2]));
                    sortDate = d.getTime();
                }

                events.push({
                    sortDate: sortDate,
                    dateCol: mmMatch ? mmMatch[0] : "",
                    titleCol: cleanText,
                    stationCol: "", // 不顯示
                    mergedCol: cleanText,
                    isMeeting: cleanText.includes("會"),
                    manager: managerName
                });
            }
        });

        // 5. 分類行程
        const categorized = categorizeByManager(events);

        // 6. 匯出專屬報表
        await exportSingleDeGeExcel(categorized[managerName] || categorized["未匹配站點"], managerName, stationsStr, timeData, periodStr);

    } catch (e) {
        console.error("處理 Excel 過程發生錯誤：", e);
        throw e;
    }
};
