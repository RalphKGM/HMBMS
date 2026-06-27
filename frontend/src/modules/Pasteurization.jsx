import { useMemo, useState } from 'react'
import Table from '../components/Table'
import { fullName, nextId, today } from '../utils/helpers'

const resultOptions = ['PASS', 'FAIL']

function Pasteurization({ currentUser, data, updateData }) {
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [form, setForm] = useState({
    preTestResult: '',
    pasteurizationDate: today(),
    postTestResult: '',
    remarks: '',
  })

  const pasteurizationRecords = data.pasteurizationRecords || []

  const workQueue = useMemo(() => {
    return pasteurizationRecords.filter((record) => {
      const batch = data.batches.find((item) => item.id === record.batchId)
      return batch && !['Available', 'Dispensed', 'Disposed'].includes(batch.status)
    })
  }, [data.batches, pasteurizationRecords])

  const selectedRecord = pasteurizationRecords.find((record) => record.id === Number(selectedRecordId))

  function resetForm() {
    setForm({
      preTestResult: '',
      pasteurizationDate: today(),
      postTestResult: '',
      remarks: '',
    })
    setSelectedRecordId('')
  }

  function savePreTest(record) {
    const batch = data.batches.find((item) => item.id === record.batchId)
    if (!batch) return

    const isFail = form.preTestResult === 'FAIL'
    const nextStatus = isFail ? 'Disposed' : 'Pending Pasteurization'

    const batches = data.batches.map((item) => {
      if (item.id !== batch.id) return item
      return { ...item, status: nextStatus }
    })

    const pasteurizationRecordsNext = pasteurizationRecords.map((item) => {
      if (item.id !== record.id) return item
      return {
        ...item,
        preTestResult: form.preTestResult,
        status: nextStatus,
        remarks: form.remarks,
      }
    })

    const disposalRecords = isFail
      ? [
          ...(data.disposalRecords || []),
          {
            disposalId: nextId(data.disposalRecords || []),
            batchId: batch.id,
            beforeDisposalVolume: Number(batch.availableVolume || 0),
            disposalDate: today(),
            reason: 'Failed Pre-Pasteurization Test',
            disposedBy: currentUser?.id || null,
            createdAt: new Date().toISOString(),
          },
        ]
      : data.disposalRecords || []

    updateData(
      { ...data, batches, pasteurizationRecords: pasteurizationRecordsNext, disposalRecords },
      isFail ? 'Pre-test failed. Batch disposed.' : 'Pre-test passed. Batch moved to pasteurization.'
    )
    resetForm()
  }

  function savePasteurization(record) {
    const batch = data.batches.find((item) => item.id === record.batchId)
    if (!batch) return

    const batches = data.batches.map((item) => {
      if (item.id !== batch.id) return item
      return { ...item, status: 'Available' }
    })

    const pasteurizationRecordsNext = pasteurizationRecords.map((item) => {
      if (item.id !== record.id) return item
      return {
        ...item,
        pasteurizationDate: form.pasteurizationDate,
        postTestResult: form.postTestResult,
        remarks: form.remarks,
        status: form.postTestResult === 'FAIL' ? 'Disposed' : 'Available',
      }
    })

    const disposalRecords = form.postTestResult === 'FAIL'
      ? [
          ...(data.disposalRecords || []),
          {
            disposalId: nextId(data.disposalRecords || []),
            batchId: batch.id,
            beforeDisposalVolume: Number(batch.availableVolume || 0),
            disposalDate: form.pasteurizationDate,
            reason: 'Failed Post-Pasteurization Test',
            disposedBy: currentUser?.id || null,
            createdAt: new Date().toISOString(),
          },
        ]
      : data.disposalRecords || []

    const finalBatches = form.postTestResult === 'FAIL'
      ? batches.map((item) => (item.id === batch.id ? { ...item, status: 'Disposed', availableVolume: 0 } : item))
      : batches

    updateData(
      { ...data, batches: finalBatches, pasteurizationRecords: pasteurizationRecordsNext, disposalRecords },
      form.postTestResult === 'FAIL' ? 'Post-test failed. Batch disposed.' : 'Pasteurization complete. Batch available.'
    )
    resetForm()
  }

  return (
    <section>
      <h2>Pasteurization</h2>

      <p>Pasteurization records are created automatically when a Milk Record is saved.</p>

      <Table
        headers={['Batch Number', 'Donor', 'Collection Date', 'Current Status', 'Actions']}
        rows={workQueue.map((record) => {
          const batch = data.batches.find((item) => item.id === record.batchId)
          const collection = (data.milkCollections || []).find((item) => item.batchId === record.batchId)
          const donor = data.donors.find((item) => item.id === collection?.donorId)
          const canPreTest = batch?.status === 'Pending Lab'
          const canPasteurize = batch?.status === 'Pending Pasteurization'

          return [
            batch?.batchNumber || 'Unknown',
            fullName(donor),
            collection?.collectionDate || '-',
            record.status,
            <span key={record.id}>
              <button type="button" onClick={() => setSelectedRecordId(String(record.id))}>View Details</button>
              {' '}
              {canPreTest && <button type="button" onClick={() => setSelectedRecordId(String(record.id))}>Pre-Test</button>}
              {' '}
              {canPasteurize && <button type="button" onClick={() => setSelectedRecordId(String(record.id))}>Pasteurize</button>}
            </span>,
          ]
        })}
      />

      {selectedRecord && (
        <div>
          <h3>Workflow - {selectedRecord.id}</h3>
          {renderDetails(data, selectedRecord)}

          {data.batches.find((item) => item.id === selectedRecord.batchId)?.status === 'Pending Lab' && (
            <form onSubmit={(event) => {
              event.preventDefault()
              savePreTest(selectedRecord)
            }}>
              <label>
                Pre-Test Result
                <select required value={form.preTestResult} onChange={(event) => setForm({ ...form, preTestResult: event.target.value })}>
                  <option value="">Select</option>
                  {resultOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label>
                Remarks
                <textarea value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
              </label>
              <button type="submit">Save Pre-Test</button>
            </form>
          )}

          {data.batches.find((item) => item.id === selectedRecord.batchId)?.status === 'Pending Pasteurization' && (
            <form onSubmit={(event) => {
              event.preventDefault()
              savePasteurization(selectedRecord)
            }}>
              <label>
                Pasteurization Date
                <input type="date" value={form.pasteurizationDate} onChange={(event) => setForm({ ...form, pasteurizationDate: event.target.value })} />
              </label>
              <label>
                Post-Test Result
                <select required value={form.postTestResult} onChange={(event) => setForm({ ...form, postTestResult: event.target.value })}>
                  <option value="">Select</option>
                  {resultOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label>
                Remarks
                <textarea value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
              </label>
              <button type="submit">Save Pasteurization</button>
            </form>
          )}

          <button type="button" onClick={() => setSelectedRecordId('')}>Close</button>
        </div>
      )}
    </section>
  )
}

function renderDetails(data, record) {
  const batch = data.batches.find((item) => item.id === record.batchId)
  const collection = (data.milkCollections || []).find((item) => item.batchId === record.batchId)
  const donor = data.donors.find((item) => item.id === collection?.donorId)

  return (
    <>
      <p>Batch Number: {batch?.batchNumber || '-'}</p>
      <p>Donor: {fullName(donor)}</p>
      <p>Collection Date: {collection?.collectionDate || '-'}</p>
      <p>Current Status: {record.status}</p>
    </>
  )
}

export default Pasteurization
