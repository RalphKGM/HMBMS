import { useState } from 'react'
import Table from '../components/Table'
import { fullName, money } from '../utils/helpers'

function Reports({ data }) {
  const [type, setType] = useState('donors')

  const reports = {
    donors: {
      title: 'Donor Report',
      headers: ['DTN', 'Name', 'Program', 'Status'],
      rows: data.donors.map((donor) => [donor.dtn, fullName(donor), donor.collectionProgram, donor.status]),
    },
    beneficiaries: {
      title: 'Beneficiary Report',
      headers: ['Name', 'Contact', 'Address', 'Status'],
      rows: data.beneficiaries.map((beneficiary) => [fullName(beneficiary), beneficiary.contactNumber, beneficiary.address, beneficiary.isActive ? 'Active' : 'Inactive']),
    },
    milk: {
      title: 'Milk Collection Report',
      headers: ['Batch Number', 'Collected Volume', 'Remaining Volume', 'Status'],
      rows: data.batches.map((batch) => [batch.batchNumber, `${batch.totalVolume} mL`, `${batch.availableVolume} mL`, batch.status]),
    },
    pasteurization: {
      title: 'Pasteurization Report',
      headers: ['Batch Number', 'Status', 'Expiration Date'],
      rows: data.batches.map((batch) => [batch.batchNumber, batch.status, batch.expirationDate || '-']),
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
    disposal: {
      title: 'Disposal Report',
      headers: ['Batch Number', 'Status', 'Remaining Volume'],
      rows: data.batches.filter((batch) => batch.status === 'Disposed').map((batch) => [batch.batchNumber, batch.status, `${batch.availableVolume} mL`]),
    },
    sms: {
      title: 'SMS Report',
      headers: ['Beneficiary', 'Message', 'Sent Date', 'Status'],
      rows: data.smsLogs.map((log) => {
        const beneficiary = data.beneficiaries.find((item) => item.id === log.beneficiaryId)
        return [fullName(beneficiary), log.message, log.sentDate, log.status]
      }),
    },
  }

  const report = reports[type]

  return (
    <section>
      <h2>Reports</h2>
      <label>
        Report Type
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="donors">Donor Report</option>
          <option value="beneficiaries">Beneficiary Report</option>
          <option value="milk">Milk Collection Report</option>
          <option value="pasteurization">Pasteurization Report</option>
          <option value="dispensing">Dispensing Report</option>
          <option value="disposal">Disposal Report</option>
          <option value="sms">SMS Report</option>
        </select>
      </label>
      <button onClick={() => window.print()} type="button">Print</button>
      <h3>{report.title}</h3>
      <Table headers={report.headers} rows={report.rows} />
    </section>
  )
}

export default Reports
