import { useState } from 'react'
import { Calendar, FileBarChart } from 'lucide-react'
import GoogleAuth from './components/GoogleAuth'
import QueryForm from './components/QueryForm'
import ActionPanel from './components/ActionPanel'
import DeGeDataCleaner from './components/DeGeDataCleaner'
import { mergeCategorizedData, STATION_MANAGER_MAPPING } from './services/DataProcessorService'
import { exportToExcel } from './services/ExcelExportService'
import { Layers, CheckCircle2 } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('calendar') // 'calendar' or 'excel'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [eventsData, setEventsData] = useState([])
  const [calendars, setCalendars] = useState([])

  // 新增：合併資料狀態
  const [calendarResult, setCalendarResult] = useState(null)
  const [excelResult, setExcelResult] = useState(null)

  const handleMergedExport = async () => {
    setIsProcessing(true)
    try {
      // 合併資料
      const merged = mergeCategorizedData(
        calendarResult?.categorized,
        excelResult?.categorized
      )

      // 決定標頭資訊
      // 優先使用 Excel 提供的精密期間，若無則用行事曆日期
      const start = excelResult?.periodStr?.split('至')[0] || calendarResult?.startDate || new Date().toISOString().split('T')[0]
      const end = excelResult?.periodStr?.split('至')[1] || calendarResult?.endDate || new Date().toISOString().split('T')[0]

      await exportToExcel(merged, start, end, STATION_MANAGER_MAPPING)
      alert("合併匯出成功！")
    } catch (err) {
      console.error("合併匯出失敗:", err)
      alert("合併匯出發生錯誤")
    } finally {
      setIsProcessing(false)
    }
  }

  const hasAnyData = !!(calendarResult || excelResult)

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
          <DeGeDataCleaner onDataProcessed={setExcelResult} />
        )}
      </main>

      {/* 合併匯出控制面板 */}
      {hasAnyData && (
        <div className="glass-panel animate-fade-in" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--primary-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={24} color="var(--primary)" />
                <h3 style={{ margin: 0 }}>資料合併預覽</h3>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                {calendarResult && (
                  <div className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> 行事曆資料已就緒
                  </div>
                )}
                {excelResult && (
                  <div className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> 德哥 Excel 已就緒
                  </div>
                )}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleMergedExport}
              disabled={isProcessing}
              style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
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
