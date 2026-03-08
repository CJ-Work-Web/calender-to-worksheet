import { useState } from 'react'
import { Calendar, FileBarChart } from 'lucide-react'
import GoogleAuth from './components/GoogleAuth'
import QueryForm from './components/QueryForm'
import ActionPanel from './components/ActionPanel'
import DeGeDataCleaner from './components/DeGeDataCleaner'

function App() {
  const [activeTab, setActiveTab] = useState('calendar') // 'calendar' or 'excel'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [eventsData, setEventsData] = useState([])
  const [calendars, setCalendars] = useState([])

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
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'excel' && (
          <DeGeDataCleaner />
        )}
      </main>
    </div>
  )
}

export default App
