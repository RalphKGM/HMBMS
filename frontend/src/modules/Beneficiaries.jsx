import { useState, useEffect } from 'react'
import Table from '../components/Table'
import { fullName } from '../utils/helpers'
import { 
  fetchBeneficiariesData, 
  dbInsertBeneficiary, 
  dbToggleBeneficiaryStatus, 
  dbInsertInquiry 
} from '../lib/dataStore'

function Beneficiaries({ currentUser }) { 
  const [dbData, setDbData] = useState({ beneficiaries: [], inquiries: [] })
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [notice, setNotice] = useState('')
  
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    address: '',
  })
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null)

  async function loadRealData() {
    try {
      setLoading(true)
      const data = await fetchBeneficiariesData()
      setDbData(data)
    } catch (err) {
      setErrorMsg('Failed to sync with live database: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRealData()
  }, [])

  function triggerNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 4000)
  }

  const filteredBeneficiaries = dbData.beneficiaries.filter((b) => {
    const text = `${fullName(b)} ${b.contactNumber} ${b.address} ${b.isActive ? 'Active' : 'Inactive'}`
    return text.toLowerCase().includes(query.toLowerCase())
  })

  function resetForm() {
    setForm({
      firstName: '',
      lastName: '',
      contactNumber: '',
      address: '',
    })
  }

  async function saveBeneficiary(event) {
    event.preventDefault()
    try {
      const currentUserId = currentUser?.user_id || null
      await dbInsertBeneficiary(form, currentUserId)
      triggerNotice(`Beneficiary ${form.firstName} ${form.lastName} registered successfully.`)
      resetForm()
      await loadRealData() 
    } catch (err) {
      setErrorMsg('Could not save beneficiary: ' + err.message)
    }
  }

  async function toggleBeneficiary(id, currentStatus, name) {
    try {
      await dbToggleBeneficiaryStatus(id, currentStatus)
      triggerNotice(`Beneficiary ${name} status updated.`)
      await loadRealData()
    } catch (err) {
      setErrorMsg('Could not update status: ' + err.message)
    }
  }

  async function logInquiry(beneficiaryId) {
    try {
      const currentUserId = currentUser?.user_id || null
      await dbInsertInquiry(beneficiaryId, currentUserId)
      triggerNotice('Milk availability inquiry logged.')
      await loadRealData()
    } catch (err) {
      setErrorMsg('Could not log inquiry: ' + err.message)
    }
  }

  const inquiriesForSelected = selectedBeneficiary
    ? dbData.inquiries.filter((i) => i.beneficiaryId === selectedBeneficiary.id)
    : []

  if (loading) return <p>Loading matching database collections...</p>

  return (
    <section>
      <h2>Beneficiary Management</h2>

      {errorMsg && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>}
      {notice && <p style={{ color: 'green', backgroundColor: '#e6ffe6', padding: '8px' }}>{notice}</p>}

      <form onSubmit={saveBeneficiary}>
        <label>First Name <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
        <label>Last Name <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
        <label>Contact Number <input required value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></label>
        <label>Address <textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <button type="submit">Save Beneficiary</button>
      </form>

      <h3>Beneficiary List</h3>
      <label>Search <input value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <Table
        headers={['Name', 'Contact', 'Address', 'Status', 'Actions']}
        rows={filteredBeneficiaries.map((b) => [
          fullName(b),
          b.contactNumber,
          b.address,
          b.isActive ? 'Active' : 'Inactive',
          <span key={b.id}>
            <button type="button" onClick={() => toggleBeneficiary(b.id, b.isActive, fullName(b))}>
              {b.isActive ? 'Deactivate' : 'Activate'}
            </button>
            {' '}
            <button type="button" onClick={() => setSelectedBeneficiary(b)}>
              View Inquiries
            </button>
            {' '}
            <button type="button" onClick={() => logInquiry(b.id)}>
              Log Inquiry
            </button>
          </span>,
        ])}
      />

      {selectedBeneficiary && (
        <div>
          <h3>Inquiry History — {fullName(selectedBeneficiary)}</h3>
          <button type="button" onClick={() => setSelectedBeneficiary(null)}>Close</button>
          {inquiriesForSelected.length === 0 ? (
            <p>No inquiries logged yet.</p>
          ) : (
            <Table
              headers={['Inquiry Date', 'Status']}
              rows={inquiriesForSelected.map((i) => [i.inquiryDate, i.status])}
            />
          )}
        </div>
      )}
    </section>
  )
}

export default Beneficiaries