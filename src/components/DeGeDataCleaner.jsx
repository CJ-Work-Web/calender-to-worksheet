import React, { useState } from 'react';
import { Upload, FileDown, FileSpreadsheet } from 'lucide-react';
import { processDeGeExcel } from '../services/DeGeDataProcessorService';

const DeGeDataCleaner = ({ file, setFile, onDataProcessed }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    // 自動處理：當檔案選取後立即解析
    React.useEffect(() => {
        const autoProcess = async () => {
            if (!file) return;
            setIsProcessing(true);
            try {
                const result = await processDeGeExcel(file);
                if (onDataProcessed) {
                    onDataProcessed(result);
                }
            } catch (error) {
                console.error("自動處理失敗:", error);
                alert(`處理 Excel 發生錯誤：\n${error.message || error}`);
            } finally {
                setIsProcessing(false);
            }
        };
        autoProcess();
    }, [file, onDataProcessed]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setExportSuccess(false);
        }
    };

    const handleDownload = async () => {
        if (!file || isProcessing) return;

        // 此按鈕現在只負責下載功能
        setIsProcessing(true);
        try {
            // 重新執行一次解析並下載 (為了獲取 ExcelExportService 需要的參數)
            // 或是從 App.jsx 傳入處理好的結果來下載。
            // 為了不破壞現有結構，這裡點擊下載時若已處理好，直接執行 export 單獨匯出邏輯。
            // 由於 processDeGeExcel 之前被我改成了 return data，我們需要引入導出的功能。
            // 或是更簡單的：UI 上點擊下載，就呼叫目前的 processDeGeExcel (它會 return data)，
            // 然後我們在這裡呼叫 exportSingleDeGeExcel。

            const result = await processDeGeExcel(file);
            const { exportSingleDeGeExcel } = await import('../services/ExcelExportService');
            await exportSingleDeGeExcel(result.categorized[result.managerName] || result.categorized["未匹配站點"], result.managerName, result.stationsStr, result.reportTitle, result.periodStr);

            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000);
        } catch (error) {
            console.error("下載失敗:", error);
            alert("下載報表發生錯誤");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={24} color="var(--primary)" />
                    德哥工作日誌整理
                </h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    請上傳「現場主任工作內容」Excel 檔案。系統將自動過濾空白、不必要的文字與標點符號，並產出標準格式的日誌報表。
                </p>
            </div>

            <div className="upload-container" style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0.2)',
                position: 'relative',
                transition: 'all 0.3s'
            }}>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        opacity: 0, cursor: 'pointer'
                    }}
                />
                <Upload size={48} color={file ? 'var(--success)' : 'var(--text-muted)'} style={{ marginBottom: '1rem' }} />
                {file ? (
                    <div>
                        <h4 style={{ color: 'var(--text-active)', marginBottom: '0.5rem' }}>已選取檔案</h4>
                        <p style={{ color: 'var(--success)', fontWeight: '500' }}>{file.name}</p>
                    </div>
                ) : (
                    <div>
                        <h4 style={{ color: 'var(--text-active)', marginBottom: '0.5rem' }}>點擊或拖放檔案至此</h4>
                        <p style={{ color: 'var(--text-muted)' }}>支援 .xlsx, .xls 格式</p>
                    </div>
                )}
            </div>

            <button
                className={`btn ${exportSuccess ? 'btn-success' : ''}`}
                onClick={handleDownload}
                disabled={!file || isProcessing}
                style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}
            >
                {isProcessing ? (
                    <div className="spinner"></div>
                ) : (
                    <>
                        <FileDown size={20} />
                        {exportSuccess ? '下載成功！' : '下載報表'}
                    </>
                )}
            </button>

            {exportSuccess && (
                <p style={{ color: 'var(--success)', textAlign: 'center', fontSize: '0.95rem' }} className="animate-fade-in">
                    報表已成功下載至您的電腦！
                </p>
            )}
        </div>
    );
};

export default DeGeDataCleaner;
