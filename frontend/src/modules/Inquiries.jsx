import { useMemo, useState } from 'react'
import Table from '../components/Table'
import { fullName, nextId, today } from '../utils/helpers'

function Inquiries({ data, updateData }) {
  const [statusFilter, setStatusFilter] = useState('All')
  const [query, setQuery] = useState('')

  const orderedInquiries = useMemo(() => {
    return [...(data.inquiries || [])]
      .sort((a, b) => {
        if (a.inquiryDate === b.inquiryDate) return a.id - b.id
        return a.inquiryDate.localeCompare(b.inquiryDate)
      })
      .map((inquiry, index) => ({ ...inquiry, queueNumber: index + 1 }))
  }, [data.inquiries])

  const rows = orderedInquiries.filter((inquiry) => {
    const beneficiary = data.beneficiaries.find((item) => item.id === inquiry.beneficiaryId)
    const text = `${inquiry.queueNumber} ${fullName(beneficiary)} ${beneficiary?.contactNumber || ''} ${inquiry.status}`
    const matchesQuery = text.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'All' || inquiry.status === statusFilter
    return matchesQuery && matchesStatus
  })

  function notifyInquiry(inquiry) {
    const beneficiary = data.beneficiaries.find((item) => item.id === inquiry.beneficiaryId)
    if (!beneficiary) {
      updateData(data, 'Unable to send notification.')
      return
    }

    const sentDate = today()
    const smsLog = {
      id: nextId(data.smsLogs),
      beneficiaryId: beneficiary.id,
      message: 'Milk is now available at the milk bank. Please contact staff for confirmation.',
      sentDate,
      status: 'Sent',
    }

    const inquiries = data.inquiries.map((item) => {
      if (item.id !== inquiry.id) return item
      return { ...item, status: 'Notified', smsDate: sentDate }
    })

    updateData(
      { ...data, inquiries, smsLogs: [...data.smsLogs, smsLog] },
      `Notification sent to ${fullName(beneficiary)}.`
    )
  }

  return (
    <section>
      <h2>Inquiries</h2>
      <p>Inquiry queue order is based on the original inquiry date and record order.</p>

      <label>
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>

      <label>
        Filter
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Notified">Notified</option>
          <option value="Closed">Closed</option>
        </select>
      </label>

      <Table
        headers={['Queue #', 'Beneficiary', 'Contact', 'Inquiry Date', 'Requested Volume', 'Remarks', 'Status', 'Actions']}
        rows={rows.map((inquiry) => {
          const beneficiary = data.beneficiaries.find((item) => item.id === inquiry.beneficiaryId)
          const canNotify = inquiry.status === 'Pending'
          return [
            inquiry.queueNumber,
            fullName(beneficiary),
            beneficiary?.contactNumber || '-',
            inquiry.inquiryDate,
            `${Number(inquiry.requestedVolume || 0)} mL`,
            inquiry.remarks || '-',
            inquiry.status,
            <span key={inquiry.id}>
              <button type="button" onClick={() => notifyInquiry(inquiry)} disabled={!canNotify}>
                Notify SMS
              </button>
            </span>,
          ]
        })}
      />
    </section>
  )
}

export default Inquiries
