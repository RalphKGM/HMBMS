import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import { seedData } from './data/seedData'
import { loadAppData, saveAppData } from './lib/dataStore'
import { isSupabaseConfigured } from './lib/supabase'
import Beneficiaries from './modules/Beneficiaries'
import Dispensing from './modules/Dispensing'
import Donors from './modules/Donors'
import MilkRecords from './modules/MilkRecords'
import Pasteurization from './modules/Pasteurization'
import Reports from './modules/Reports'
import SmsLog from './modules/SmsLog'
import './App.css'

const pages = [
  'Dashboard',
  'Donors',
  'Beneficiaries',
  'Milk Records',
  'Pasteurization',
  'Dispensing',
  'Reports',
  'SMS Log',
]

function App() {
  const [data, setData] = useState(seedData)
  const [currentUser, setCurrentUser] = useState(null)
  const [page, setPage] = useState('Dashboard')
  const [message, setMessage] = useState('')
  const [databaseStatus, setDatabaseStatus] = useState('Loading data...')

  useEffect(() => {
    async function loadData() {
      const result = await loadAppData(seedData)
      setData(result.data)
      setDatabaseStatus(
        result.error
          ? `Using localStorage. Supabase error: ${result.error}`
          : `Using ${result.source}.`,
      )
    }

    loadData()
  }, [])

  async function updateData(nextData, notice) {
    setData(nextData)
    setMessage(notice || '')
    const result = await saveAppData(nextData)
    setDatabaseStatus(
      result.error
        ? `Saved locally. Supabase error: ${result.error}`
        : `Saved to ${result.source}.`,
    )
  }

  if (!currentUser) {
    return <Login data={data} setCurrentUser={setCurrentUser} />
  }

  return (
    <main>
      <header>
        <h1>Human Milk Bank Management System</h1>
        <p>
          Logged in as {currentUser.name} ({currentUser.role})
        </p>
        <p>
          Database: {databaseStatus} {isSupabaseConfigured ? '' : 'Add .env keys to enable Supabase.'}
        </p>
        <button onClick={() => setCurrentUser(null)} type="button">Logout</button>
      </header>

      <nav>
        {pages.map((item) => (
          <button
            className={page === item ? 'active' : ''}
            key={item}
            onClick={() => setPage(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

      {message && <p className="message">{message}</p>}

      {page === 'Dashboard' && <Dashboard data={data} />}
      {page === 'Donors' && <Donors data={data} updateData={updateData} />}
      {page === 'Beneficiaries' && <Beneficiaries />}
      {page === 'Milk Records' && <MilkRecords />}
      {page === 'Pasteurization' && <Pasteurization />}
      {page === 'Dispensing' && <Dispensing currentUser={currentUser} data={data} updateData={updateData} />}
      {page === 'Reports' && <Reports data={data} />}
      {page === 'SMS Log' && <SmsLog currentUser={currentUser} data={data} updateData={updateData} />}
    </main>
  )
}

export default App
