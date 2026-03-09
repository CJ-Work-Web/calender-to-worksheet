import { STATION_MANAGER_MAPPING } from '../services/DataProcessorService';

const ActionPanel = ({ eventsData, isProcessing, setIsProcessing, processedEventsCache }) => {
    const [exportSuccess, setExportSuccess] = useState(false);

    const handleExport = async () => {
        if (!processedEventsCache) return;

        setIsProcessing(true);
        setExportSuccess(false);

        try {
            const { exportToExcel } = await import('../services/ExcelExportService');

            // 決定報表標題
            const reportTitle = `${processedEventsCache.startDate.split('-')[0]}年${processedEventsCache.startDate.split('-')[1]}月份 工作日誌整體執行情形說明表`;

            // 3. 匯出 Excel (使用已處理好的快取資料 P2)
            await exportToExcel(processedEventsCache.categorized, reportTitle, processedEventsCache.periodStr, STATION_MANAGER_MAPPING);

            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000);
        } catch (err) {
            console.error("匯出失敗:", err);
            alert("匯出 Excel 發生錯誤");
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
                {exportSuccess ? '下載成功！' : '下載報表'}
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
