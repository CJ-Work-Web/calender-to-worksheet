import React, { useState } from 'react';
import { Upload, FileDown, FileSpreadsheet } from 'lucide-react';
import { processDeGeExcel } from '../services/DeGeDataProcessorService';

const DeGeDataCleaner = ({ onDataProcessed }) => {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setExportSuccess(false);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        setIsProcessing(true);
        setExportSuccess(false);

        try {
            const result = await processDeGeExcel(file);
            if (onDataProcessed) {
                onDataProcessed(result);
            }
            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000);
        } catch (error) {
            console.error("處理失敗:", error);
            alert(`處理 Excel 發生錯誤：\n${error.message || error}\n請檢查檔案格式是否正確，或將此錯誤訊息截圖回報。`);
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
                onClick={handleProcess}
                disabled={!file || isProcessing}
                style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}
            >
                {isProcessing ? (
                    <div className="spinner"></div>
                ) : (
                    <>
                        <FileDown size={20} />
                        {exportSuccess ? '處理並下載成功！' : '處理並下載報表'}
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
