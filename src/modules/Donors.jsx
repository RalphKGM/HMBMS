import { useState } from 'react'
import Table from '../components/Table'
import { fullName, nextId } from '../utils/helpers'

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

  function resetForm() {
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
    resetForm()
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

export default Donors
