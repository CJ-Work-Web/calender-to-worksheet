import React, { useState, useEffect } from 'react'
import { Calendar, Layers, CheckCircle2, Circle, FileBarChart } from 'lucide-react'
import GoogleAuth from './components/GoogleAuth'
import QueryForm from './components/QueryForm'
import ActionPanel from './components/ActionPanel'
import DeGeDataCleaner from './components/DeGeDataCleaner'
import { mergeCategorizedData, STATION_MANAGER_MAPPING, processEvents, categorizeByManager } from './services/DataProcessorService'
import { processDeGeExcel } from './services/DeGeDataProcessorService'
import { format, startOfMonth, endOfMonth } from 'date-fns'

// 輔助工具：將 YYYY-MM-DD 轉換為 民國年 格式
const toTWDate = (dateStr) => {
  if (!dateStr || !dateStr.includes('-')) return "xxx年xx月xx日";
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(y) - 1911}年${parseInt(m)}月${parseInt(d)}日`;
};

const toTWMonth = (dateStr) => {
  if (!dateStr || !dateStr.includes('-')) return "xxx年xx月";
  const [y, m] = dateStr.split('-');
  return `${parseInt(y) - 1911}年${parseInt(m)}月`;
};

function App() {
  const [activeTab, setActiveTab] = useState('calendar') // 'calendar' or 'excel'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [eventsData, setEventsData] = useState([])
  const [calendars, setCalendars] = useState([])

  // 新增：雙來源資料狀態
  const [excelFile, setExcelFile] = useState(null)

  // 處理後的快取 (供匯出或合併使用)
  // 查詢日期狀態 (P2: 移除 document.getElementById)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // 快取處理過的資料，避免重複解析 (P2)
  const [processedEventsCache, setProcessedEventsCache] = useState(null);
  const [excelResult, setExcelResult] = useState(null) // Keep this for DeGeDataCleaner output

  // 自動處理：當行事曆行程更新時立即解析
  useEffect(() => {
    if (eventsData.length > 0) {
      const processed = categorizeByManager(processEvents(eventsData));
      const startDateInput = startDate;
      const endDateInput = endDate;
      // 構建民國年期間字串
      const periodStr = `${toTWDate(startDateInput)}至${toTWDate(endDateInput)}`;

      setProcessedEventsCache({
        categorized: processed,
        startDate: startDateInput,
        endDate: endDateInput,
        periodStr: periodStr
      });
    } else {
      setProcessedEventsCache(null);
    }
  }, [eventsData, startDate, endDate]);

  const handleMergedExport = async () => {
    setIsProcessing(true)
    try {
      const { exportToExcel } = await import('./services/ExcelExportService');

      let finalCategorized = {};
      let finalTitle = "";
      let finalPeriod = "";

      // 優先使用行事曆的日期與標題，若無則使用 Excel 的
      if (processedEventsCache) {
        finalTitle = `${toTWMonth(processedEventsCache.startDate)}份 工作日誌整體執行情形說明表`;
        finalPeriod = processedEventsCache.periodStr;
      } else if (excelResult) {
        finalTitle = excelResult.reportTitle;
        finalPeriod = excelResult.periodStr;
      }

      // 合併兩個來源的分類資料
      finalCategorized = mergeCategorizedData(
        processedEventsCache ? processedEventsCache.categorized : null,
        excelResult ? excelResult.categorized : null
      );

      if (Object.keys(finalCategorized).length === 0) {
        alert("目前沒有可匯出的資料！")
        return
      }

      await exportToExcel(finalCategorized, finalTitle, finalPeriod, STATION_MANAGER_MAPPING);
      alert("合併匯出成功！")
    } catch (err) {
      console.error("合併匯出失敗:", err)
      alert("合併匯出發生錯誤：" + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="app-container animate-fade-in">
      <header className="header">
        <h1 className="title-gradient" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Calendar size={40} color="#6366f1" />
          捷運代管系統
        </h1>
      </header>

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={18} />
          行事曆轉工作日誌
        </button>
        <button
          className={`tab-btn ${activeTab === 'excel' ? 'active' : ''}`}
          onClick={() => setActiveTab('excel')}
        >
          <FileBarChart size={18} />
          德哥工作日誌整理
        </button>
      </div>

      <main className="glass-panel" style={{ padding: activeTab === 'excel' ? '0' : '2.5rem', background: activeTab === 'excel' ? 'transparent' : '', border: activeTab === 'excel' ? 'none' : '', boxShadow: activeTab === 'excel' ? 'none' : '' }}>
        {activeTab === 'calendar' && (
          <div className="animate-fade-in">
            <GoogleAuth
              isAuthenticated={isAuthenticated}
              setIsAuthenticated={setIsAuthenticated}
              setCalendars={setCalendars}
            />

            {isAuthenticated && (
              <div className="grid-2" style={{ marginTop: '2rem' }}>
                <QueryForm
                  calendars={calendars}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  setEventsData={setEventsData}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                />
                <ActionPanel
                  eventsData={eventsData}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  processedEventsCache={processedEventsCache}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'excel' && (
          <DeGeDataCleaner
            file={excelFile}
            setFile={setExcelFile}
            onDataProcessed={setExcelResult}
            excelResult={excelResult}
          />
        )}
      </main>

      {/* 合併匯出面板：只要有任一資料載入就顯示 */}
      {(processedEventsCache || excelResult) && (
        <div style={{ marginTop: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--primary-low)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>合併匯出總報表</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  將包含以下資料：
                  {processedEventsCache && <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>✓ Google 行事曆 ({eventsData.length} 筆)</span>}
                  {excelResult && <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>✓ 德哥 Excel (已載入)</span>}
                </p>
              </div>
              <button
                className="btn"
                onClick={handleMergedExport}
                disabled={isProcessing}
                style={{ padding: '0.8rem 2rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
              >
                <FileBarChart size={20} />
                合併下載報表
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
