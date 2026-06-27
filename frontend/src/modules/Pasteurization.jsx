import { useState } from 'react'
import Table from '../components/Table'
import { fullName, nextId, today } from '../utils/helpers'

function Pasteurization({ data, updateData }) {
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [form, setForm] = useState({
    preTestResult: '',
    pasteurizationDate: today(),
    postTestResult: '',
  })

  const selectedBatch = data.batches.find((batch) => batch.id === Number(selectedBatchId))
  const eligibleInquiries = selectedBatch
    ? data.inquiries.filter((inquiry) => inquiry.status === 'Pending' && Number(inquiry.requestedVolume || 0) <= Number(selectedBatch.availableVolume || 0))
    : []

  function savePasteurization(event) {
    event.preventDefault()
    if (!selectedBatch) return

    const batches = data.batches.map((batch) => {
      if (batch.id !== selectedBatch.id) return batch
      return {
        ...batch,
        status: form.postTestResult === 'PASS' ? 'Available' : 'Disposed',
      }
    })

    updateData({ ...data, batches }, 'Pasteurization record saved.')
  }

  function notifyInquiry(inquiry) {
    const sentDate = today()
    const smsLog = {
      id: nextId(data.smsLogs),
      beneficiaryId: inquiry.beneficiaryId,
      sentDate,
      message: 'Milk is now available at the milk bank. Please contact staff for confirmation.',
      status: 'Sent',
    }

    const inquiries = data.inquiries.map((item) => {
      if (item.id !== inquiry.id) return item
      return { ...item, status: 'Notified', smsDate: sentDate }
    })

    updateData({ ...data, inquiries, smsLogs: [...data.smsLogs, smsLog] }, 'Pending inquiry notified.')
  }

  return (
    <section>
      <h2>Pasteurization</h2>
      <form onSubmit={savePasteurization}>
        <label>
          Batch
          <select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)}>
            <option value="">Select</option>
            {data.batches.map((batch) => (
              <option key={batch.id} value={batch.id}>{batch.batchNumber} - {batch.status}</option>
            ))}
          </select>
        </label>
        <label>Pre-Test Result <input value={form.preTestResult} onChange={(event) => setForm({ ...form, preTestResult: event.target.value })} /></label>
        <label>Pasteurization Date <input type="date" value={form.pasteurizationDate} onChange={(event) => setForm({ ...form, pasteurizationDate: event.target.value })} /></label>
        <label>Post-Test Result <select required value={form.postTestResult} onChange={(event) => setForm({ ...form, postTestResult: event.target.value })}><option value="">Select</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option></select></label>
        <button type="submit">Save Pasteurization</button>
      </form>

      <h3>Eligible Pending Inquiries</h3>
      {selectedBatch && selectedBatch.status === 'Available' && eligibleInquiries.length > 0 ? (
        <Table
          headers={['Beneficiary', 'Requested Volume', 'Remarks', 'Action']}
          rows={eligibleInquiries.map((inquiry) => {
            const beneficiary = data.beneficiaries.find((item) => item.id === inquiry.beneficiaryId)
            return [fullName(beneficiary), `${inquiry.requestedVolume} mL`, inquiry.remarks || '-', <button key={inquiry.id} type="button" onClick={() => notifyInquiry(inquiry)}>Notify</button>]
          })}
        />
      ) : (
        <p>No eligible inquiries for the selected batch.</p>
      )}
    </section>
  )
}

export default Pasteurization
