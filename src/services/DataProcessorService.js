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

/**
 * 處理原始事件資料
 */
export const processEvents = (events) => {
    // 為了精準匹配，先處理清冊：提取「核心站名」(去括號、去"站"字)，並依長度降冪排序
    const sortedMapping = [...STATION_MANAGER_MAPPING]
        .map(item => ({
            ...item,
            // 例如 "台電大樓站(交13)" -> "台電大樓"
            coreName: item.station.split('(')[0].replace(/站$/, '')
        }))
        .sort((a, b) => b.coreName.length - a.coreName.length);

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
        let matchedStation = "";
        let matchedManager = "未匹配站點";

        for (const item of sortedMapping) {
            // 只要標題中包含核心站名 (例如 "古亭"、"台電大樓") 就算匹配
            if (cleanTitle.includes(item.coreName)) {
                matchedStation = item.station;
                matchedManager = item.manager;
                break;
            }
        }

        // 4. D 欄 (合併)
        let titleNoUnderscore = cleanTitle.split('_')[0];
        const isMeeting = titleNoUnderscore.includes("會");

        let mergedText = "";
        if (isMeeting) {
            mergedText = `${dateFormatted}，${titleNoUnderscore}，無與機關有關重要議題。`;
        } else {
            mergedText = `${dateFormatted}，${titleNoUnderscore}。`;
        }

        return {
            sortDate,
            dateCol: dateFormatted,
            titleCol: cleanTitle,
            stationCol: matchedStation,
            mergedCol: mergedText,
            isMeeting,
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
        if (title.includes("巡檢")) {
            groups[mgr][CATEGORIES.INSPECT].push(item);
        } else if (title.includes("點交") || title.includes("公證") || title.includes("簽約") ||
            title.includes("起租") || title.includes("退租") || title.includes("續租") ||
            title.includes("續約") || title.includes("三方移轉") || title.includes("租賃權移轉")) {
            groups[mgr][CATEGORIES.HANDOVER].push(item);
        } else if (title.includes("例會") || title.includes("區權會") || title.includes("區大") ||
            title.includes("委員會") || title.includes("臨時會") || title.includes("委員推舉") ||
            title.includes("起始會議")) {
            groups[mgr][CATEGORIES.MEETING].push(item);
        } else if (title.includes("催收") || title.includes("貼單")) {
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
