import { useMemo, useState } from 'react'
import Table from '../components/Table'
import { fullName, nextId, today } from '../utils/helpers'

const initialForm = {
  donorId: '',
  collectionType: 'Supsup Todo',
  collectionDate: today(),
  volumeMl: '',
  collectedBy: '',
}

function MilkRecords({ data, updateData }) {
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [editingBatchId, setEditingBatchId] = useState(null)
  const [form, setForm] = useState(initialForm)

  const donorOptions = data.donors || []
  const userOptions = data.users || []
  const collections = data.milkCollections || []

  const records = useMemo(() => {
    return data.batches.map((batch) => {
      const collection = collections.find((item) => item.batchId === batch.id)
      const donor = donorOptions.find((item) => item.id === collection?.donorId)
      return {
        batch,
        collection,
        donor,
      }
    })
  }, [data.batches, collections, donorOptions])

  const filteredRecords = records.filter(({ batch, donor, collection }) => {
    const text = `${batch.batchNumber} ${fullName(donor)} ${collection?.collectionType || ''}`
    const matchesQuery = text.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'All' || batch.status === statusFilter
    return matchesQuery && matchesStatus
  })

  function resetForm() {
    setForm({
      donorId: '',
      collectionType: 'Supsup Todo',
      collectionDate: today(),
      volumeMl: '',
      collectedBy: '',
    })
    setEditingBatchId(null)
    setShowForm(false)
  }

  function openNewForm() {
    setForm({
      donorId: donorOptions[0]?.id ? String(donorOptions[0].id) : '',
      collectionType: 'Supsup Todo',
      collectionDate: today(),
      volumeMl: '',
      collectedBy: userOptions[0]?.id ? String(userOptions[0].id) : '',
    })
    setEditingBatchId(null)
    setShowForm(true)
  }

  function saveMilkRecord(event) {
    event.preventDefault()

    const collectedVolume = Number(form.volumeMl)
    if (collectedVolume <= 0) {
      updateData(data, 'Collected volume must be greater than zero.')
      return
    }

    const donor = donorOptions.find((item) => item.id === Number(form.donorId))
    const collectedBy = userOptions.find((item) => item.id === Number(form.collectedBy))

    const existingBatch = editingBatchId
      ? data.batches.find((batch) => batch.id === editingBatchId)
      : null

    const batchId = existingBatch?.id || nextId(data.batches)
    const batchNumber = existingBatch?.batchNumber || `BATCH-${today().slice(0, 4)}-${String(batchId).padStart(3, '0')}`

    const batch = {
      id: batchId,
      batchNumber,
      is_pooled: false,
      totalVolume: collectedVolume,
      availableVolume: collectedVolume,
      status: 'Pending Lab',
      expirationDate: existingBatch?.expirationDate || '',
      donorId: donor?.id || null,
      collectionType: form.collectionType,
      collectionDate: form.collectionDate,
      collectedBy: collectedBy?.id || null,
    }

    const collection = {
      id: existingBatch ? collections.find((item) => item.batchId === existingBatch.id)?.id || nextId(collections) : nextId(collections),
      batchId,
      donorId: donor?.id || null,
      collectionType: form.collectionType,
      collectionDate: form.collectionDate,
      volumeMl: collectedVolume,
      collectedBy: collectedBy?.id || null,
    }

    const nextBatches = existingBatch
      ? data.batches.map((item) => (item.id === existingBatch.id ? { ...item, ...batch } : item))
      : [...data.batches, batch]

    const existingCollectionIndex = collections.findIndex((item) => item.batchId === batchId)
    const nextCollections = existingCollectionIndex >= 0
      ? collections.map((item) => (item.batchId === batchId ? collection : item))
      : [...collections, collection]

    updateData(
      { ...data, batches: nextBatches, milkCollections: nextCollections },
      existingBatch ? 'Milk record updated.' : 'Milk record saved.'
    )
    resetForm()
  }

  function editCollection(batch) {
    const collection = collections.find((item) => item.batchId === batch.id)
    setEditingBatchId(batch.id)
    setForm({
      donorId: String(collection?.donorId || batch.donorId || ''),
      collectionType: collection?.collectionType || batch.collectionType || 'Supsup Todo',
      collectionDate: collection?.collectionDate || batch.collectionDate || today(),
      volumeMl: String(collection?.volumeMl || batch.totalVolume || ''),
      collectedBy: String(collection?.collectedBy || batch.collectedBy || ''),
    })
    setShowForm(true)
  }

  function deleteCollection(batchId) {
    const nextBatches = data.batches.filter((batch) => batch.id !== batchId)
    const nextCollections = collections.filter((item) => item.batchId !== batchId)
    updateData({ ...data, batches: nextBatches, milkCollections: nextCollections }, 'Milk record deleted.')
    if (selectedBatch?.id === batchId) {
      setSelectedBatch(null)
    }
  }

  return (
    <section>
      <h2>Milk Records</h2>

      <button type="button" onClick={openNewForm}>
        Add Milk Record
      </button>

      {showForm && (
        <form onSubmit={saveMilkRecord}>
          <label>
            Batch Number
            <input readOnly value={editingBatchId ? data.batches.find((batch) => batch.id === editingBatchId)?.batchNumber || '' : `Auto-generated on save`} />
          </label>
          <label>
            Donor
            <select required value={form.donorId} onChange={(event) => setForm({ ...form, donorId: event.target.value })}>
              <option value="">Select</option>
              {donorOptions.map((donor) => (
                <option key={donor.id} value={donor.id}>
                  {fullName(donor)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Collection Program
            <select required value={form.collectionType} onChange={(event) => setForm({ ...form, collectionType: event.target.value })}>
              <option value="Supsup Todo">Supsup Todo</option>
              <option value="Milky Way">Milky Way</option>
              <option value="Mom's Act">Mom's Act</option>
            </select>
          </label>
          <label>
            Collection Date
            <input required type="date" value={form.collectionDate} onChange={(event) => setForm({ ...form, collectionDate: event.target.value })} />
          </label>
          <label>
            Collected Volume (mL)
            <input required min="1" type="number" value={form.volumeMl} onChange={(event) => setForm({ ...form, volumeMl: event.target.value })} />
          </label>
          <label>
            Collected By
            <select required value={form.collectedBy} onChange={(event) => setForm({ ...form, collectedBy: event.target.value })}>
              <option value="">Select</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.role}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">{editingBatchId ? 'Update Milk Record' : 'Save Milk Record'}</button>
          <button type="button" onClick={resetForm}>Cancel</button>
        </form>
      )}

      <label>
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>

      <label>
        Filter
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="All">All</option>
          <option value="Pending Lab">Pending Lab</option>
          <option value="Pending Pasteurization">Pending Pasteurization</option>
          <option value="Available">Available</option>
          <option value="Dispensed">Dispensed</option>
          <option value="Disposed">Disposed</option>
        </select>
      </label>

      <Table
        headers={['Batch Number', 'Donor', 'Collection Program', 'Collection Date', 'Total Volume', 'Available Volume', 'Status', 'Actions']}
        rows={filteredRecords.map(({ batch, donor, collection }) => [
          batch.batchNumber,
          fullName(donor),
          collection?.collectionType || batch.collectionType || '-',
          collection?.collectionDate || batch.collectionDate || '-',
          `${Number(batch.totalVolume || 0)} mL`,
          `${Number(batch.availableVolume || 0)} mL`,
          batch.status,
          <span key={batch.id}>
            <button type="button" onClick={() => setSelectedBatch({ batch, donor, collection })}>View Details</button>
            {' '}
            <button type="button" onClick={() => editCollection(batch)}>Edit Collection</button>
            {' '}
            <button type="button" onClick={() => deleteCollection(batch.id)}>Delete</button>
          </span>,
        ])}
      />

      {selectedBatch && (
        <div>
          <h3>Milk Record Details</h3>
          <p>Batch Number: {selectedBatch.batch.batchNumber}</p>
          <p>Donor: {fullName(selectedBatch.donor)}</p>
          <p>Collection Program: {selectedBatch.collection?.collectionType || selectedBatch.batch.collectionType || '-'}</p>
          <p>Collection Date: {selectedBatch.collection?.collectionDate || selectedBatch.batch.collectionDate || '-'}</p>
          <p>Collected Volume: {Number(selectedBatch.collection?.volumeMl || selectedBatch.batch.totalVolume || 0)} mL</p>
          <p>Available Volume: {Number(selectedBatch.batch.availableVolume || 0)} mL</p>
          <p>Status: {selectedBatch.batch.status}</p>
          <p>Created By: {userOptions.find((user) => user.id === Number(selectedBatch.collection?.collectedBy || selectedBatch.batch.collectedBy))?.name || '-'}</p>
          <button type="button" onClick={() => setSelectedBatch(null)}>Close</button>
        </div>
      )}
    </section>
  )
}

export default MilkRecords
