import ExcelJS from 'exceljs';
import { categorizeByManager, STATION_MANAGER_MAPPING, findStationAndManager } from './DataProcessorService';

export const processDeGeExcel = async (file) => {
    try {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0]; // Assume first sheet is the one to use

        // 安全提取 cell 文字的函式，避免 exceljs 遇到 null/error 時的 toString 崩潰
        const getSafeText = (cell) => {
            if (!cell || cell.value === null || cell.value === undefined) return "";
            if (cell.type === ExcelJS.ValueType.Error) return "";
            if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
                return cell.value.richText.map(rt => rt.text).join("");
            }
            try {
                return cell.text || String(cell.value);
            } catch (e) {
                return "";
            }
        };

        // 1. 擷取第一列的時間資料
        let reportTitle = getSafeText(worksheet.getCell('A1')) || getSafeText(worksheet.getCell('B1')) || "";
        let timeData = "xxx年xx月"; // 預設值

        // 移除空格並嘗試匹配，例如 "115年 2月份" -> "115年2月"
        const cleanTitleForMatch = reportTitle.replace(/\s+/g, "");
        const titleMatch = cleanTitleForMatch.match(/(\d{3}年\d{1,2})月/);

        if (titleMatch) {
            timeData = titleMatch[1] + "月";
        }

        // 2. 擷取第二列的現場主任姓名
        let managerName = "";
        for (let c = 1; c <= 10; c++) {
            let val = getSafeText(worksheet.getCell(2, c));
            if (val && val.includes("現場主任")) {
                if (val === "現場主任：" || val === "現場主任") {
                    managerName = getSafeText(worksheet.getCell(2, c + 1));
                    break;
                } else {
                    managerName = val.replace("現場主任：", "").replace("現場主任", "").replace(":", "").trim();
                    break;
                }
            }
        }
        if (!managerName) managerName = "未知主任";

        // 對應負責案場 (這部分給傳統單獨匯出用，合併匯出時開發者可自由組合)
        let matchingStations = STATION_MANAGER_MAPPING.filter(m => m.manager === managerName).map(m => m.station);
        let stationsList = [...new Set(matchingStations)];
        let stationsStr = stationsList.length > 0 ? stationsList.join("、") : "無";

        // 3. 擷取第三列的執行期間
        let periodStr = "";
        for (let c = 1; c <= 10; c++) {
            let val = getSafeText(worksheet.getCell(3, c));
            if (val && val.includes("執行期間")) {
                if (val === "執行期間：" || val === "執行期間") {
                    periodStr = getSafeText(worksheet.getCell(3, c + 1));
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
                const cellText = getSafeText(cell);
                if (colNumber >= 2 && cellText && cellText !== "無") {
                    if (!rowText) rowText = cellText;
                }
            });

            if (!rowText || rowText === "無" || rowText.length < 5) return;

            // 如果該行以月份日期開頭，則視為一筆行程
            if (/^\d{1,2}月\d{1,2}日/.test(rowText)) {
                let cleanText = rowText;

                // 移除空格 (包括全形半形)
                cleanText = cleanText.replace(/\s+/g, "").replace(/　/g, "");

                // 移除特定文字 (按照長度降冪排序，確保「屬」與「更新」字不會遺留)
                const wordsToRemove = [
                    "屬契約外修繕項目", "屬契約內修繕項目",
                    "契約外修繕項目", "契約內修繕項目",
                    "整組更新", "更新", "處理", "支援"
                ];
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

                // [新增] 針對修繕行程補上「現勘」
                // 判斷邏輯需與 DataProcessorService 一致
                const isInspect = cleanText.includes("巡檢");
                const isHandover = ["點交", "公證", "簽約", "起租", "退租", "續租", "續約", "三方移轉", "租賃權移轉"].some(k => cleanText.includes(k));
                const isMeeting = ["例會", "區權會", "區大", "委員會", "臨時會", "委員推舉", "起始會議"].some(k => cleanText.includes(k));
                const isPayment = ["催收", "貼單"].some(k => cleanText.includes(k));

                if (!isInspect && !isHandover && !isMeeting && !isPayment) {
                    // 是維護類，在日期逗號後加上「現勘」
                    cleanText = cleanText.replace(/^(\d{1,2}月\d{1,2}日)，/, "$1，現勘");
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

                // 執行特定替換規則：美河市 -> 新店機廠 (以利自動比對)
                cleanText = cleanText.replace(/美河市/g, "新店機廠");

                // 移除重複或連續的不同標點符號 (，。 或 。， 等)，僅保留最後一個
                // 匹配兩個以上的標點集合，替換為該集合的最後一個字
                cleanText = cleanText.replace(/[，。,．\.]{2,}/g, (match) => match.slice(-1));

                // 為了串接合併與排序，計算 sortDate
                let sortDate = 0;
                let mmMatch = cleanText.match(/^(\d{1,2})月(\d{1,2})日/);
                if (mmMatch) {
                    // 使用當前年份補齊
                    const d = new Date(new Date().getFullYear(), parseInt(mmMatch[1]) - 1, parseInt(mmMatch[2]));
                    sortDate = d.getTime();
                }

                // 這裡我們不再只掛在「檔案主任」名下，而是嘗試匹配站點
                const { matchedStation, matchedManager } = findStationAndManager(cleanText);

                events.push({
                    sortDate: sortDate,
                    dateCol: mmMatch ? mmMatch[0] : "",
                    titleCol: cleanText,
                    stationCol: matchedStation,
                    mergedCol: cleanText,
                    isMeeting: cleanText.includes("會"),
                    manager: matchedManager !== "未匹配站點" ? matchedManager : managerName
                });
            }
        });

        // 5. 分類行程
        const categorized = categorizeByManager(events);

        // 6. 回傳資料與標頭資訊
        return {
            categorized,
            reportTitle: timeData,
            periodStr,
            managerName,
            stationsStr
        };

    } catch (e) {
        console.error("處理 Excel 過程發生錯誤：", e);
        throw e;
    }
};
