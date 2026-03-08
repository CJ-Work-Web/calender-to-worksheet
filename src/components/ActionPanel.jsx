import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { processEvents, categorizeByManager, STATION_MANAGER_MAPPING } from '../services/DataProcessorService';
import { exportToExcel } from '../services/ExcelExportService';

const ActionPanel = ({ eventsData, isProcessing, setIsProcessing }) => {
    const [exportSuccess, setExportSuccess] = useState(false);

    const handleExport = async () => {
        setIsProcessing(true);
        setExportSuccess(false);

        try {
            // 1. 處理所有事件 (清洗、比對)
            const processed = processEvents(eventsData);

            // 2. 轉換格式與分類排版 (七大類別)
            const groupedData = categorizeByManager(processed);

            // 試圖從 DOM 抓取目前選擇的日期來當作報表參數，這邊預期父層有儲存，但最快方式是讀 DOM 或是從 eventsData 猜
            // 依照需求：時間資料使用前端網頁的"開始日期"及"結束日期"
            const startDateInput = document.getElementById('startDate')?.value || new Date().toISOString().split('T')[0];
            const endDateInput = document.getElementById('endDate')?.value || new Date().toISOString().split('T')[0];

            // 3. 匯出 Excel (使用 ExcelJS 與範本)
            await exportToExcel(groupedData, startDateInput, endDateInput, STATION_MANAGER_MAPPING);

            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000); // 3 秒後自動隱藏成功訊息
        } catch (err) {
            console.error("匯出失敗:", err);
            alert("匯出 Excel 發生錯誤，請查看控制台日誌。");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!eventsData || eventsData.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <FileSpreadsheet size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                    尚未取得行程資料
                    <br />
                    <span style={{ fontSize: '0.85rem' }}>請先在左側設定查詢條件並抓取行程</span>
                </p>
            </div>
        );
    }

    return (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>處理與匯出</h3>

            <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>資料狀態</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>已抓取行程總數</span>
                        <span className="badge badge-success">{eventsData.length} 筆</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>支援站點比對</span>
                        <span className="badge badge-success">已啟用</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>主任名單對應</span>
                        <span className="badge badge-success">已啟用</span>
                    </div>
                </div>
            </div>

            <button
                className={`btn ${exportSuccess ? 'btn-success' : ''}`}
                onClick={handleExport}
                disabled={isProcessing || eventsData.length === 0}
                style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}
            >
                <Download size={20} />
                {exportSuccess ? '匯出成功！' : '處理並下載報表'}
            </button>

            {exportSuccess && (
                <p style={{ color: 'var(--success)', textAlign: 'center', marginTop: '1.25rem', fontSize: '0.95rem' }} className="animate-fade-in">
                    報表已成功下載至您的電腦，包含自動開啟的篩選列。
                </p>
            )}
        </div>
    );
};

export default ActionPanel;
