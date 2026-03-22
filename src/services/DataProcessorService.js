import { format, parseISO } from 'date-fns';

/** 
 * 站點與主任清冊 (由 Excel 讀取後寫入)
 */
export const STATION_MANAGER_MAPPING = [
    { "station": "景美站(交4)", "manager": "鄭秋燕" },
    { "station": "公館站(交11)", "manager": "鄭御書" },
    { "station": "七張站(捷10)", "manager": "林宏德" },
    { "station": "新店機廠站(捷17.18.19)", "manager": "許宏毅" },
    { "station": "萬隆站(交6.7)", "manager": "鄭御書" },
    { "station": "新店區公所站(捷22)", "manager": "林宏德" },
    { "station": "大坪林站(捷8)", "manager": "林宏德" },
    { "station": "景美站(交3)", "manager": "鄭秋燕" },
    { "station": "新店站(捷24.25.26.27)", "manager": "林宏德" },
    { "station": "台電大樓站(交13)", "manager": "鄭秋燕" },
    { "station": "古亭站(交14)", "manager": "鄭御書" },
    { "station": "古亭站(交15)", "manager": "鄭御書" },
    { "station": "頂溪站(捷3)", "manager": "鄭御書" },
    { "station": "景安站(捷5)", "manager": "鄭御書" },
    { "station": "南勢角站", "manager": "鄭御書" },
    { "station": "中和高中站", "manager": "鄭秋燕" }
];

// 預先計算排序後的站點清單（模組載入時執行一次，避免每次呼叫重建）
const SORTED_MAPPING = [...STATION_MANAGER_MAPPING]
    .map(item => ({ ...item, coreName: item.station.split('(')[0].replace(/站$/, '') }))
    .sort((a, b) => b.coreName.length - a.coreName.length);

/**
 * 在標題中尋找對應的站點與主任
 */
export const findStationAndManager = (title) => {
    let matchedStation = "";
    let matchedManager = "未匹配站點";

    const cleanTitle = (title || "").replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

    for (const item of SORTED_MAPPING) {
        if (cleanTitle.includes(item.coreName)) {
            matchedStation = item.station;
            matchedManager = item.manager;
            break;
        }
    }

    return { matchedStation, matchedManager };
};

/**
 * 定義各大類別的關鍵字
 */
export const CATEGORY_KEYWORDS = {
    INSPECT: ["巡檢"],
    HANDOVER: ["點交", "公證", "簽約", "起租", "退租", "續租", "續約", "三方移轉", "租賃權移轉"],
    MEETING: ["例會", "區權會", "區大", "委員會", "管委會", "臨時會", "委員推舉", "起始會議", "區分所有權人會議", "臨時區分所有權人會議"],
    PAYMENT: ["催收", "貼單"]
};

/**
 * 處理原始事件資料
 */
export const processEvents = (events) => {
    return events.map(event => {
        // 1. A 欄 (日期)
        let dateStr = event.start.dateTime || event.start.date;
        const dateObj = parseISO(dateStr);
        const dateFormatted = format(dateObj, 'MM月dd日');
        const sortDate = dateObj.getTime();

        // 2. B 欄 (標題)
        const rawTitle = event.summary || "(無標題)";
        const cleanTitle = rawTitle.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

        // 3. C 欄 (站點) 與 主任 判定
        const { matchedStation, matchedManager } = findStationAndManager(cleanTitle);

        // 4. D 欄 (合併) - 資料清洗規則
        let titleNoUnderscore = cleanTitle.split('_')[0];

        // 全局刪除文字：更新、更換、整組更新
        titleNoUnderscore = titleNoUnderscore.replace(/更新|更換|整組更新/g, "");

        // 門牌號碼格式轉換 (順序不可對調)
        titleNoUnderscore = titleNoUnderscore.replace(/(\d+)[Ff]-(\d+)/g, '$1樓之$2');          // XXF-X → XX樓之X
        titleNoUnderscore = titleNoUnderscore.replace(/(\d+)-(\d+)-(\d+)/g, '$1號$2樓之$3');    // XXX-XX-XX → XXX號XX樓之XX
        titleNoUnderscore = titleNoUnderscore.replace(/([^-\d])-(\d+)-(\d+)/g, '$1，$2之$3');   // 文字-數字-數字 → 文字，數字之數字
        titleNoUnderscore = titleNoUnderscore.replace(/-/g, '，');                              // 其餘 - → ，

        // 使用全標題判定分類以免套用「現勘」邏輯 (避免底線後的關鍵字被漏掉)
        const isMtg = CATEGORY_KEYWORDS.MEETING.some(k => cleanTitle.includes(k));
        const isInspect = CATEGORY_KEYWORDS.INSPECT.some(k => cleanTitle.includes(k));
        const isHandover = CATEGORY_KEYWORDS.HANDOVER.some(k => cleanTitle.includes(k));
        const isPayment = CATEGORY_KEYWORDS.PAYMENT.some(k => cleanTitle.includes(k));

        // 若都不屬於上述，則補上「現勘」 (若無)
        let mergedText = "";
        if (isMtg) {
            // 會議補上結尾句型
            let meetingTitle = titleNoUnderscore;
            mergedText = `${dateFormatted}，${meetingTitle}，無與機關有關重要議題。`;
        } else {
            // 判斷是否為「修繕維護」類別 (即非巡檢、點交、會議、催收)
            const isMaintenance = !isInspect && !isHandover && !isPayment;
            let finalTitle = titleNoUnderscore;
            if (isMaintenance && !finalTitle.includes("現勘") && !finalTitle.includes("場勘")) {
                finalTitle = "現勘" + finalTitle;
            }
            mergedText = `${dateFormatted}，${finalTitle}。`;
        }

        return {
            sortDate,
            dateCol: dateFormatted,
            titleCol: cleanTitle,
            stationCol: matchedStation,
            mergedCol: mergedText,
            isMeeting: isMtg,
            manager: matchedManager
        };
    });
};

/**
 * 定義七大類別清單
 */
export const CATEGORIES = {
    INSPECT: "空屋、空車位定期巡檢",
    HANDOVER: "房屋、車位起租/退租點交",
    MEETING: "出席管理委員會、區權會",
    MAINTENANCE: "房屋、車位修繕維護",
    PAYMENT: "租金、管理費催繳",
    DISPUTE: "爭議事項",
    OTHER_TASK: "其它機關交辦事項"
};

/**
 * 依據主任進行分類排版 (7大類別新版)
 */
export const categorizeByManager = (processedData) => {
    const groups = {};

    // 1. 初始化主任分群
    // 確保 "未匹配站點" 永遠存在
    groups["未匹配站點"] = {
        [CATEGORIES.INSPECT]: [],
        [CATEGORIES.HANDOVER]: [],
        [CATEGORIES.MEETING]: [],
        [CATEGORIES.MAINTENANCE]: [],
        [CATEGORIES.PAYMENT]: [],
        [CATEGORIES.DISPUTE]: [],
        [CATEGORIES.OTHER_TASK]: []
    };

    processedData.forEach(item => {
        const mgr = item.manager;
        if (!groups[mgr]) {
            groups[mgr] = {
                [CATEGORIES.INSPECT]: [],
                [CATEGORIES.HANDOVER]: [],
                [CATEGORIES.MEETING]: [],
                [CATEGORIES.MAINTENANCE]: [],
                [CATEGORIES.PAYMENT]: [],
                [CATEGORIES.DISPUTE]: [],
                [CATEGORIES.OTHER_TASK]: []
            };
        }

        const title = item.titleCol;

        // 2. 關鍵字分類邏輯
        if (CATEGORY_KEYWORDS.INSPECT.some(k => title.includes(k))) {
            groups[mgr][CATEGORIES.INSPECT].push(item);
        } else if (CATEGORY_KEYWORDS.HANDOVER.some(k => title.includes(k))) {
            groups[mgr][CATEGORIES.HANDOVER].push(item);
        } else if (CATEGORY_KEYWORDS.MEETING.some(k => title.includes(k))) {
            groups[mgr][CATEGORIES.MEETING].push(item);
        } else if (CATEGORY_KEYWORDS.PAYMENT.some(k => title.includes(k))) {
            groups[mgr][CATEGORIES.PAYMENT].push(item);
        } else {
            // 無匹配關鍵字者，歸入修繕
            groups[mgr][CATEGORIES.MAINTENANCE].push(item);
        }
    });

    // 3. 排序各類別內的行程 (依日期)
    Object.keys(groups).forEach(mgr => {
        const sortFn = (a, b) => a.sortDate - b.sortDate;
        Object.values(CATEGORIES).forEach(cat => {
            groups[mgr][cat].sort(sortFn);
        });
    });

    return groups;
};

/**
 * 合併多個已經分類好的主任資料集
 */
export const mergeCategorizedData = (...dataSets) => {
    const merged = {};

    dataSets.forEach(dataSet => {
        if (!dataSet) return;

        Object.keys(dataSet).forEach(mgr => {
            if (!merged[mgr]) {
                merged[mgr] = {};
                Object.values(CATEGORIES).forEach(cat => {
                    merged[mgr][cat] = [];
                });
            }

            Object.values(CATEGORIES).forEach(cat => {
                if (dataSet[mgr] && dataSet[mgr][cat]) {
                    merged[mgr][cat] = [...merged[mgr][cat], ...dataSet[mgr][cat]];
                }
            });
        });
    });

    // 重新排序合併後的資料
    Object.keys(merged).forEach(mgr => {
        Object.values(CATEGORIES).forEach(cat => {
            merged[mgr][cat].sort((a, b) => a.sortDate - b.sortDate);
        });
    });

    return merged;
};
