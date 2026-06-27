import { useMemo, useState } from 'react'
import Table from '../components/Table'
import { fullName, nextId, today } from '../utils/helpers'

const reasonOptions = [
  'Failed Laboratory Test',
  'Failed Post-Pasteurization Test',
  'Expired',
  'Contaminated',
  'Damaged Container',
  'Other',
]

function DisposalRecords({ currentUser, data, updateData }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [query, setQuery] = useState('')
  const [reasonFilter, setReasonFilter] = useState('All')
  const [form, setForm] = useState({
    batchId: '',
    disposalDate: today(),
    reason: 'Failed Laboratory Test',
    customReason: '',
    disposedBy: currentUser?.id || '',
  })

  const disposalRecords = data.disposalRecords || []

  const availableBatches = useMemo(() => {
    const disposedBatchIds = new Set(disposalRecords.map((record) => record.batchId))
    return data.batches.filter((batch) => !disposedBatchIds.has(batch.id) && batch.status !== 'Disposed')
  }, [data.batches, disposalRecords])

  const rows = disposalRecords.filter((record) => {
    const batch = data.batches.find((item) => item.id === record.batchId)
    const donors = getDonorNames(data, batch)
    const text = `${batch?.batchNumber || ''} ${donors} ${record.reason}`
    const matchesQuery = text.toLowerCase().includes(query.toLowerCase())
    const matchesReason = reasonFilter === 'All' || record.reason === reasonFilter
    return matchesQuery && matchesReason
  })

  function resetForm() {
    setForm({
      batchId: '',
      disposalDate: today(),
      reason: 'Failed Laboratory Test',
      customReason: '',
      disposedBy: currentUser?.id || '',
    })
    setShowForm(false)
  }

  function openForm() {
    setForm({
      batchId: '',
      disposalDate: today(),
      reason: 'Failed Laboratory Test',
      customReason: '',
      disposedBy: currentUser?.id || '',
    })
    setShowForm(true)
  }

  function saveDisposal(event) {
    event.preventDefault()
    const batch = data.batches.find((item) => item.id === Number(form.batchId))

    if (!batch) {
      updateData(data, 'Please select a valid batch.')
      return
    }

    if (batch.status === 'Disposed' || batch.status === 'Dispensed') {
      updateData(data, 'This batch has already been disposed or fully dispensed.')
      return
    }

    const reason = form.reason === 'Other' ? form.customReason.trim() : form.reason
    if (!reason) {
      updateData(data, 'Please provide a disposal reason.')
      return
    }

    const disposalRecord = {
      disposalId: nextId(disposalRecords),
      batchId: batch.id,
      beforeDisposalVolume: Number(batch.availableVolume || 0),
      disposalDate: form.disposalDate,
      reason,
      disposedBy: Number(form.disposedBy) || currentUser?.id || null,
      createdAt: new Date().toISOString(),
    }

    const batches = data.batches.map((item) => {
      if (item.id !== batch.id) return item
      return {
        ...item,
        status: 'Disposed',
        availableVolume: 0,
      }
    })

    updateData(
      { ...data, batches, disposalRecords: [...disposalRecords, disposalRecord] },
      'Disposal record saved.'
    )
    resetForm()
  }

  return (
    <section>
      <h2>Disposal Records</h2>

      <button type="button" onClick={openForm}>Add Disposal Record</button>

      {showForm && (
        <form onSubmit={saveDisposal}>
          <label>
            Batch
            <select required value={form.batchId} onChange={(event) => setForm({ ...form, batchId: event.target.value })}>
              <option value="">Select</option>
              {availableBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batchNumber} - {batch.availableVolume} mL - {batch.status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Disposal Date
            <input required type="date" value={form.disposalDate} onChange={(event) => setForm({ ...form, disposalDate: event.target.value })} />
          </label>
          <label>
            Reason
            <select required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}>
              {reasonOptions.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </label>
          {form.reason === 'Other' && (
            <label>
              Custom Reason
              <textarea required value={form.customReason} onChange={(event) => setForm({ ...form, customReason: event.target.value })} />
            </label>
          )}
          <label>
            Disposed By
            <select required value={form.disposedBy} onChange={(event) => setForm({ ...form, disposedBy: event.target.value })}>
              <option value="">Select</option>
              {data.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.role}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Save Disposal Record</button>
          <button type="button" onClick={resetForm}>Cancel</button>
        </form>
      )}

      <label>
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>

      <label>
        Filter
        <select value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value)}>
          <option value="All">All</option>
          {reasonOptions.map((reason) => (
            <option key={reason} value={reason}>{reason}</option>
          ))}
        </select>
      </label>

      <Table
        headers={['Disposal ID', 'Batch Number', 'Donor(s)', 'Disposal Date', 'Reason', 'Disposed By', 'Created At', 'Actions']}
        rows={rows.map((record) => {
          const batch = data.batches.find((item) => item.id === record.batchId)
          const disposedBy = data.users.find((user) => user.id === Number(record.disposedBy))
          return [
            record.disposalId,
            batch?.batchNumber || 'Unknown',
            getDonorNames(data, batch),
            record.disposalDate,
            record.reason,
            disposedBy ? `${disposedBy.name} (${disposedBy.role})` : '-',
            record.createdAt,
            <button key={record.disposalId} type="button" onClick={() => setSelectedRecord(record)}>View Details</button>,
          ]
        })}
      />

      {selectedRecord && (
        <div>
          <h3>Disposal Details</h3>
          {renderDetails(data, selectedRecord)}
          <button type="button" onClick={() => setSelectedRecord(null)}>Close</button>
        </div>
      )}
    </section>
  )
}

function getDonorNames(data, batch) {
  if (!batch) return '-'
  const collection = (data.milkCollections || []).find((item) => item.batchId === batch.id)
  const donor = data.donors.find((item) => item.id === collection?.donorId)
  return fullName(donor)
}

function renderDetails(data, record) {
  const batch = data.batches.find((item) => item.id === record.batchId)
  const collection = (data.milkCollections || []).find((item) => item.batchId === record.batchId)
  const disposedBy = data.users.find((user) => user.id === Number(record.disposedBy))
  const donor = data.donors.find((item) => item.id === collection?.donorId)

  return (
    <>
      <p>Batch Number: {batch?.batchNumber || '-'}</p>
      <p>Donor(s): {fullName(donor)}</p>
      <p>Collection Program: {collection?.collectionType || batch?.collectionType || '-'}</p>
      <p>Collection Date: {collection?.collectionDate || batch?.collectionDate || '-'}</p>
      <p>Total Volume: {Number(batch?.totalVolume || 0)} mL</p>
      <p>Available Volume before Disposal: {Number(record.beforeDisposalVolume ?? batch?.totalVolume ?? 0)} mL</p>
      <p>Disposal Date: {record.disposalDate}</p>
      <p>Reason: {record.reason}</p>
      <p>Disposed By: {disposedBy ? `${disposedBy.name} (${disposedBy.role})` : '-'}</p>
      <p>Created At: {record.createdAt}</p>
    </>
  )
}

export default DisposalRecords
