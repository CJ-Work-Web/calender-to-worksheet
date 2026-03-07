import { useState } from 'react'
import { Calendar } from 'lucide-react'
import GoogleAuth from './components/GoogleAuth'
import QueryForm from './components/QueryForm'
import ActionPanel from './components/ActionPanel'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [eventsData, setEventsData] = useState([])
  const [calendars, setCalendars] = useState([])

  return (
    <div className="app-container animate-fade-in">
      <header className="header">
        <h1 className="title-gradient">
          <Calendar size={40} color="#6366f1" />
          捷運代管行事曆轉工作日誌
        </h1>
      </header>

      <main className="glass-panel">
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
      </main>
    </div>
  )
}

export default App
