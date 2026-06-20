import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'hmbms-react-data'

const seedData = {
  users: [
    { id: 1, username: 'admin', password: 'admin123', role: 'Administrator', name: 'System Admin' },
    { id: 2, username: 'doctor', password: 'doctor123', role: 'Doctor', name: 'Dr. Garcia' },
    { id: 3, username: 'nurse', password: 'nurse123', role: 'Nurse', name: 'Nurse Staff' },
    { id: 4, username: 'midwife', password: 'midwife123', role: 'Midwife', name: 'Midwife Staff' },
  ],
  donors: [
    {
      id: 1,
      dtn: 'DTN-2026-001',
      firstName: 'Maria',
      middleName: 'Santos',
      lastName: 'Reyes',
      birthdate: '1996-03-12',
      address: 'Bangkal, Makati City',
      contactNumber: '09171234567',
      collectionProgram: 'Supsup Todo',
      status: 'Active',
    },
    {
      id: 2,
      dtn: 'DTN-2026-002',
      firstName: 'Ana',
      middleName: 'Cruz',
      lastName: 'Dela Paz',
      birthdate: '1993-08-20',
      address: 'Palanan, Makati City',
      contactNumber: '09189876543',
      collectionProgram: "Mom's Act",
      status: 'Active',
    },
  ],
  beneficiaries: [
    { id: 1, firstName: 'Liza', lastName: 'Torres', contactNumber: '09170001111', address: 'Makati Medical Center' },
    { id: 2, firstName: 'Carla', lastName: 'Mendoza', contactNumber: '09170002222', address: 'Ospital ng Makati' },
  ],
  batches: [
    { id: 1, batchNumber: 'BATCH-2026-001', totalVolume: 650, availableVolume: 400, status: 'Available', expirationDate: '2026-07-31' },
    { id: 2, batchNumber: 'BATCH-2026-002', totalVolume: 220, availableVolume: 0, status: 'Pending Lab', expirationDate: '' },
  ],
  inquiries: [{ id: 1, beneficiaryId: 2, inquiryDate: '2026-04-28', status: 'Pending' }],
  transactions: [
    { id: 1, beneficiaryId: 1, batchId: 1, volumeDispensed: 250, price: 500, approvedBy: 2, transactionDate: '2026-04-30' },
  ],
  smsLogs: [],
}

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

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : seedData
}

function nextId(records) {
  return records.length ? Math.max(...records.map((record) => record.id)) + 1 : 1
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fullName(person) {
  if (!person) return 'Unknown'
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ')
}

function money(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`
}

function App() {
  const [data, setData] = useState(loadData)
  const [currentUser, setCurrentUser] = useState(null)
  const [page, setPage] = useState('Dashboard')
  const [message, setMessage] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  function updateData(nextData, notice) {
    setData(nextData)
    setMessage(notice || '')
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
      {page === 'Beneficiaries' && <Placeholder title="Beneficiary Management" />}
      {page === 'Milk Records' && <Placeholder title="Milk Records" />}
      {page === 'Pasteurization' && <Placeholder title="Pasteurization Tracking" />}
      {page === 'Dispensing' && <Dispensing currentUser={currentUser} data={data} updateData={updateData} />}
      {page === 'Reports' && <Reports data={data} />}
      {page === 'SMS Log' && <SmsLog currentUser={currentUser} data={data} updateData={updateData} />}
    </main>
  )
}

function Login({ data, setCurrentUser }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')

  function login(event) {
    event.preventDefault()
    const user = data.users.find((item) => item.username === username && item.password === password)
    if (!user) {
      setError('Invalid username or password.')
      return
    }
    setCurrentUser(user)
  }

  return (
    <main>
      <h1>HMBMS Login</h1>
      <form onSubmit={login}>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit">Login</button>
      </form>
      {error && <p className="message">{error}</p>}
      <h2>Demo Accounts</h2>
      <Table
        headers={['Role', 'Username', 'Password']}
        rows={data.users.map((user) => [user.role, user.username, user.password])}
      />
    </main>
  )
}

function Dashboard({ data }) {
  const availableMilk = data.batches.reduce((total, batch) => total + Number(batch.availableVolume), 0)
  const pending = data.inquiries.filter((inquiry) => inquiry.status === 'Pending').length

  return (
    <section>
      <h2>Dashboard</h2>
      <p>Available milk: {availableMilk} mL</p>
      <p>Total donors: {data.donors.length}</p>
      <p>Total beneficiaries: {data.beneficiaries.length}</p>
      <p>Pending inquiries: {pending}</p>

      <h3>Available Batches</h3>
      <Table
        headers={['Batch Number', 'Available Volume', 'Status', 'Expiration Date']}
        rows={data.batches
          .filter((batch) => batch.status === 'Available')
          .map((batch) => [batch.batchNumber, `${batch.availableVolume} mL`, batch.status, batch.expirationDate || 'Not set'])}
      />
    </section>
  )
}

function Donors({ data, updateData }) {
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthdate: '',
    address: '',
    contactNumber: '',
    collectionProgram: 'Supsup Todo',
  })

  const filteredDonors = data.donors.filter((donor) => {
    const text = `${donor.dtn} ${fullName(donor)} ${donor.collectionProgram} ${donor.status}`
    return text.toLowerCase().includes(query.toLowerCase())
  })

  function saveDonor(event) {
    event.preventDefault()
    const id = nextId(data.donors)
    const donor = {
      id,
      dtn: `DTN-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`,
      ...form,
      status: 'Active',
    }

    updateData({ ...data, donors: [...data.donors, donor] }, `Donor saved. Generated DTN: ${donor.dtn}`)
    setForm({
      firstName: '',
      middleName: '',
      lastName: '',
      birthdate: '',
      address: '',
      contactNumber: '',
      collectionProgram: 'Supsup Todo',
    })
  }

  function toggleDonor(id) {
    const donors = data.donors.map((donor) => {
      if (donor.id !== id) return donor
      return { ...donor, status: donor.status === 'Active' ? 'Inactive' : 'Active' }
    })
    updateData({ ...data, donors }, 'Donor status updated.')
  }

  return (
    <section>
      <h2>Donor Management</h2>
      <form onSubmit={saveDonor}>
        <label>First Name <input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
        <label>Middle Name <input value={form.middleName} onChange={(event) => setForm({ ...form, middleName: event.target.value })} /></label>
        <label>Last Name <input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
        <label>Birthdate <input required type="date" value={form.birthdate} onChange={(event) => setForm({ ...form, birthdate: event.target.value })} /></label>
        <label>Contact Number <input required value={form.contactNumber} onChange={(event) => setForm({ ...form, contactNumber: event.target.value })} /></label>
        <label>Address <textarea required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label>
          Collection Program
          <select value={form.collectionProgram} onChange={(event) => setForm({ ...form, collectionProgram: event.target.value })}>
            <option>Supsup Todo</option>
            <option>Mom's Act</option>
            <option>Milky Way</option>
          </select>
        </label>
        <button type="submit">Save Donor</button>
      </form>

      <h3>Donor List</h3>
      <label>Search <input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <Table
        headers={['DTN', 'Name', 'Program', 'Contact', 'Status', 'Action']}
        rows={filteredDonors.map((donor) => [
          donor.dtn,
          fullName(donor),
          donor.collectionProgram,
          donor.contactNumber,
          donor.status,
          <button key={donor.id} onClick={() => toggleDonor(donor.id)} type="button">Toggle</button>,
        ])}
      />
    </section>
  )
}

function Dispensing({ currentUser, data, updateData }) {
  const doctors = data.users.filter((user) => user.role === 'Doctor')
  const availableBatches = data.batches.filter((batch) => batch.status === 'Available' && Number(batch.availableVolume) > 0)
  const [form, setForm] = useState({
    beneficiaryId: '',
    batchId: '',
    approvedBy: doctors[0]?.id || '',
    volumeDispensed: '',
    price: '',
  })

  function saveTransaction(event) {
    event.preventDefault()
    const batch = data.batches.find((item) => item.id === Number(form.batchId))
    const volume = Number(form.volumeDispensed)

    if (!batch || volume <= 0 || volume > Number(batch.availableVolume)) {
      updateData(data, 'Invalid volume or unavailable batch.')
      return
    }

    const transaction = {
      id: nextId(data.transactions),
      beneficiaryId: Number(form.beneficiaryId),
      batchId: Number(form.batchId),
      volumeDispensed: volume,
      price: Number(form.price),
      approvedBy: Number(form.approvedBy),
      dispensedBy: currentUser.id,
      transactionDate: today(),
    }

    const batches = data.batches.map((item) => {
      if (item.id !== batch.id) return item
      const availableVolume = Number(item.availableVolume) - volume
      return { ...item, availableVolume, status: availableVolume <= 0 ? 'Dispensed' : item.status }
    })

    const inquiries = data.inquiries.map((inquiry) => {
      if (inquiry.beneficiaryId === transaction.beneficiaryId && inquiry.status === 'Pending') {
        return { ...inquiry, status: 'Fulfilled' }
      }
      return inquiry
    })

    updateData(
      { ...data, batches, inquiries, transactions: [...data.transactions, transaction] },
      'Dispensing transaction saved. Inventory updated.',
    )
    setForm({ beneficiaryId: '', batchId: '', approvedBy: doctors[0]?.id || '', volumeDispensed: '', price: '' })
  }

  return (
    <section>
      <h2>Milk Dispensing</h2>
      <form onSubmit={saveTransaction}>
        <label>
          Beneficiary
          <select required value={form.beneficiaryId} onChange={(event) => setForm({ ...form, beneficiaryId: event.target.value })}>
            <option value="">Select</option>
            {data.beneficiaries.map((beneficiary) => <option key={beneficiary.id} value={beneficiary.id}>{fullName(beneficiary)}</option>)}
          </select>
        </label>
        <label>
          Available Batch
          <select required value={form.batchId} onChange={(event) => setForm({ ...form, batchId: event.target.value })}>
            <option value="">Select</option>
            {availableBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber} - {batch.availableVolume} mL</option>)}
          </select>
        </label>
        <label>
          Doctor Approval
          <select required value={form.approvedBy} onChange={(event) => setForm({ ...form, approvedBy: event.target.value })}>
            {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
          </select>
        </label>
        <label>Volume Dispensed <input required min="1" type="number" value={form.volumeDispensed} onChange={(event) => setForm({ ...form, volumeDispensed: event.target.value })} /></label>
        <label>Price <input required min="0" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
        <button type="submit">Save Transaction</button>
      </form>

      <h3>Transactions</h3>
      <TransactionTable data={data} />
    </section>
  )
}

function Reports({ data }) {
  const [type, setType] = useState('inventory')

  const reports = {
    inventory: {
      title: 'Inventory Report',
      headers: ['Batch', 'Available Volume', 'Status', 'Expiration Date'],
      rows: data.batches.map((batch) => [batch.batchNumber, `${batch.availableVolume} mL`, batch.status, batch.expirationDate || 'Not set']),
    },
    dispensing: {
      title: 'Dispensing Report',
      headers: ['Recipient', 'Batch', 'Volume', 'Price', 'Date'],
      rows: data.transactions.map((transaction) => {
        const beneficiary = data.beneficiaries.find((item) => item.id === transaction.beneficiaryId)
        const batch = data.batches.find((item) => item.id === transaction.batchId)
        return [fullName(beneficiary), batch?.batchNumber || 'Unknown', `${transaction.volumeDispensed} mL`, money(transaction.price), transaction.transactionDate]
      }),
    },
    donors: {
      title: 'Donor Report',
      headers: ['DTN', 'Name', 'Program', 'Status'],
      rows: data.donors.map((donor) => [donor.dtn, fullName(donor), donor.collectionProgram, donor.status]),
    },
  }

  const report = reports[type]

  return (
    <section>
      <h2>Reports</h2>
      <label>
        Report Type
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="inventory">Inventory Report</option>
          <option value="dispensing">Dispensing Report</option>
          <option value="donors">Donor Report</option>
        </select>
      </label>
      <button onClick={() => window.print()} type="button">Print</button>
      <h3>{report.title}</h3>
      <Table headers={report.headers} rows={report.rows} />
    </section>
  )
}

function SmsLog({ currentUser, data, updateData }) {
  const [beneficiaryId, setBeneficiaryId] = useState('')
  const [smsMessage, setSmsMessage] = useState('Milk is now available at the milk bank. Please contact staff for confirmation.')

  function sendSms(event) {
    event.preventDefault()
    const log = {
      id: nextId(data.smsLogs),
      beneficiaryId: Number(beneficiaryId),
      message: smsMessage,
      sentBy: currentUser.id,
      sentAt: new Date().toLocaleString(),
      deliveryStatus: 'Sent',
    }
    updateData({ ...data, smsLogs: [...data.smsLogs, log] }, 'Simulated SMS sent.')
    setBeneficiaryId('')
  }

  function notifyPending() {
    const pending = data.inquiries.filter((inquiry) => inquiry.status === 'Pending')
    const logs = pending.map((inquiry, index) => ({
      id: nextId(data.smsLogs) + index,
      beneficiaryId: inquiry.beneficiaryId,
      message: 'Milk is now available at the milk bank. Please contact staff for confirmation.',
      sentBy: currentUser.id,
      sentAt: new Date().toLocaleString(),
      deliveryStatus: 'Sent',
    }))
    updateData({ ...data, smsLogs: [...data.smsLogs, ...logs] }, `${logs.length} pending notification(s) logged.`)
  }

  return (
    <section>
      <h2>SMS Log</h2>
      <form onSubmit={sendSms}>
        <label>
          Beneficiary
          <select required value={beneficiaryId} onChange={(event) => setBeneficiaryId(event.target.value)}>
            <option value="">Select</option>
            {data.beneficiaries.map((beneficiary) => (
              <option key={beneficiary.id} value={beneficiary.id}>{fullName(beneficiary)} - {beneficiary.contactNumber}</option>
            ))}
          </select>
        </label>
        <label>Message <textarea value={smsMessage} onChange={(event) => setSmsMessage(event.target.value)} /></label>
        <button type="submit">Send Simulated SMS</button>
      </form>
      <button onClick={notifyPending} type="button">Notify Pending Inquiries</button>
      <Table
        headers={['Recipient', 'Message', 'Status', 'Sent At']}
        rows={data.smsLogs.map((log) => {
          const beneficiary = data.beneficiaries.find((item) => item.id === log.beneficiaryId)
          return [fullName(beneficiary), log.message, log.deliveryStatus, log.sentAt]
        })}
      />
    </section>
  )
}

function TransactionTable({ data }) {
  return (
    <Table
      headers={['Recipient', 'Batch', 'Volume', 'Price', 'Date']}
      rows={data.transactions.map((transaction) => {
        const beneficiary = data.beneficiaries.find((item) => item.id === transaction.beneficiaryId)
        const batch = data.batches.find((item) => item.id === transaction.batchId)
        return [fullName(beneficiary), batch?.batchNumber || 'Unknown', `${transaction.volumeDispensed} mL`, money(transaction.price), transaction.transactionDate]
      })}
    />
  )
}

function Placeholder({ title}) {
  return (
    <section>
      <h2>{title}</h2>
      <p>placeholder</p>
    </section>
  )
}

function Table({ headers, rows }) {
  return (
    <table>
      <thead>
        <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
          </tr>
        )) : (
          <tr>
            <td colSpan={headers.length}>No records found.</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export default App
