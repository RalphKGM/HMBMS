import { useState } from 'react'
import Table from '../components/Table'
import { fullName, nextId } from '../utils/helpers'

function Beneficiaries({ data, updateData }) {
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    address: '',
  })
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null)

  const filteredBeneficiaries = data.beneficiaries.filter((b) => {
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

  function saveBeneficiary(event) {
    event.preventDefault()
    const id = nextId(data.beneficiaries)
    const beneficiary = {
      id,
      ...form,
      isActive: true,
    }
    updateData(
      { ...data, beneficiaries: [...data.beneficiaries, beneficiary] },
      `Beneficiary ${fullName(beneficiary)} registered.`
    )
    resetForm()
  }

  function toggleBeneficiary(id) {
    const beneficiaries = data.beneficiaries.map((b) => {
      if (b.id !== id) return b
      return { ...b, isActive: !b.isActive }
    })
    updateData({ ...data, beneficiaries }, 'Beneficiary status updated.')
  }

  function logInquiry(beneficiaryId) {
    const id = nextId(data.inquiries)
    const inquiry = {
      id,
      beneficiaryId,
      inquiryDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
    }
    updateData(
      { ...data, inquiries: [...data.inquiries, inquiry] },
      'Milk availability inquiry logged.'
    )
  }

  const inquiriesForSelected = selectedBeneficiary
    ? data.inquiries.filter((i) => i.beneficiaryId === selectedBeneficiary.id)
    : []

  return (
    <section>
      <h2>Beneficiary Management</h2>

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
            <button type="button" onClick={() => toggleBeneficiary(b.id)}>
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
