import { useState } from 'react'
import Table from '../components/Table'
import { fullName, money, nextId, today } from '../utils/helpers'

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
      if (inquiry.beneficiaryId === transaction.beneficiaryId && inquiry.status === 'Notified') {
        return { ...inquiry, status: 'Closed', closedDate: today() }
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

export default Dispensing
