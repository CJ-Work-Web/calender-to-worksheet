import { useState } from 'react'
import { Calendar, FileBarChart } from 'lucide-react'
import GoogleAuth from './components/GoogleAuth'
import QueryForm from './components/QueryForm'
import ActionPanel from './components/ActionPanel'
import DeGeDataCleaner from './components/DeGeDataCleaner'
import { mergeCategorizedData, STATION_MANAGER_MAPPING, processEvents, categorizeByManager } from './services/DataProcessorService'
import { processDeGeExcel } from './services/DeGeDataProcessorService'
import { exportToExcel } from './services/ExcelExportService'
import { Layers, CheckCircle2, Circle } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('calendar') // 'calendar' or 'excel'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [eventsData, setEventsData] = useState([])
  const [calendars, setCalendars] = useState([])

  // 新增：雙來源資料狀態
  const [excelFile, setExcelFile] = useState(null)

  // 處理後的快取 (供匯出或合併使用)
  const [calendarResult, setCalendarResult] = useState(null)
  const [excelResult, setExcelResult] = useState(null)

  // 自動處理：當行事曆行程更新時立即解析
  React.useEffect(() => {
    if (eventsData.length > 0) {
      const processed = processEvents(eventsData);
      const startDateInput = document.getElementById('startDate')?.value || new Date().toISOString().split('T')[0];
      const endDateInput = document.getElementById('endDate')?.value || new Date().toISOString().split('T')[0];

      setCalendarResult({
        categorized: categorizeByManager(processed),
        startDate: startDateInput,
        endDate: endDateInput
      });
    } else {
      setCalendarResult(null);
    }
  }, [eventsData]);

  const handleMergedExport = async () => {
    setIsProcessing(true)
    try {
      // 如果還沒處理過，就在這裡處理
      let finalCalendar = calendarResult
      if (!finalCalendar && eventsData.length > 0) {
        const processed = processEvents(eventsData)
        finalCalendar = { categorized: categorizeByManager(processed) }
      }

      let finalExcel = excelResult
      if (!finalExcel && excelFile) {
        // 需要從 DeGeDataProcessorService 導入 processDeGeExcel
        // 但為了簡單與解耦，我們讓 handleMergedExport 統一呼叫
        const result = await processDeGeExcel(excelFile)
        finalExcel = result
      }

      // 合併資料
      const merged = mergeCategorizedData(
        finalCalendar?.categorized,
        finalExcel?.categorized
      )

      if (Object.keys(merged).length === 0) {
        alert("目前沒有可匯出的資料！")
        return
      }

      // 決定標頭資訊
      // 使用者規則：若兩者皆有，以行事曆為準；否則以該頁面資料為準。
      let start, end;
      const calendarStart = calendarResult?.startDate || document.getElementById('startDate')?.value;
      const calendarEnd = calendarResult?.endDate || document.getElementById('endDate')?.value;
      const excelPeriod = finalExcel?.periodStr; // 例如 "115年02月01日至115年02月28日"

      if (eventsData.length > 0 && excelFile) {
        // 兩者皆有，以行事曆為準
        start = calendarStart;
        end = calendarEnd;
      } else if (eventsData.length > 0) {
        // 只有行事曆
        start = calendarStart;
        end = calendarEnd;
      } else {
        // 只有 Excel
        const fallbackDate = new Date().toISOString().split('T')[0];
        start = excelPeriod?.split('至')[0] || fallbackDate;
        end = excelPeriod?.split('至')[1] || fallbackDate;
      }

      await exportToExcel(merged, start, end, STATION_MANAGER_MAPPING)
      alert("合併匯出成功！")
    } catch (err) {
      console.error("合併匯出失敗:", err)
      alert("合併匯出發生錯誤：" + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const hasAnyData = eventsData.length > 0 || !!excelFile

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
                />
                <ActionPanel
                  eventsData={eventsData}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  onDataProcessed={setCalendarResult}
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
          />
        )}
      </main>

      {/* 合併匯出控制面板 */}
      {hasAnyData && (
        <div className="glass-panel animate-fade-in" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--primary-light)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={24} color="var(--primary)" />
                <h3 style={{ margin: 0 }}>合併匯出總預覽 (v2.1)</h3>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className={`badge ${eventsData.length > 0 ? 'badge-success' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: eventsData.length > 0 ? 1 : 0.4 }}>
                  {eventsData.length > 0 ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  行事曆資料 {eventsData.length > 0 ? `已就緒 (${eventsData.length}筆)` : '(待抓取)'}
                </div>
                <div className={`badge ${excelFile ? 'badge-success' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: excelFile ? 1 : 0.4 }}>
                  {excelFile ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  德哥 Excel {excelFile ? `已選取 (${excelFile.name})` : '(待上傳)'}
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleMergedExport}
              disabled={isProcessing}
              style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              {isProcessing ? <div className="spinner"></div> : '合併匯出總報表'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
