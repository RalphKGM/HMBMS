import { useState } from 'react'
import Table from '../components/Table'
import { fullName, money } from '../utils/helpers'

function Reports({ data }) {
  const [type, setType] = useState('inventory')

  const reports = {
    inventory: {
      title: 'Inventory Report',
      headers: ['Batch', 'Available Volume', 'Status', 'Expiration Date'],
      rows: data.batches.map((batch) => [
        batch.batchNumber,
        `${batch.availableVolume} mL`,
        batch.status,
        batch.expirationDate || 'Not set',
      ]),
    },
    dispensing: {
      title: 'Dispensing Report',
      headers: ['Recipient', 'Batch', 'Volume', 'Price', 'Date'],
      rows: data.transactions.map((transaction) => {
        const beneficiary = data.beneficiaries.find((item) => item.id === transaction.beneficiaryId)
        const batch = data.batches.find((item) => item.id === transaction.batchId)
        return [
          fullName(beneficiary),
          batch?.batchNumber || 'Unknown',
          `${transaction.volumeDispensed} mL`,
          money(transaction.price),
          transaction.transactionDate,
        ]
      }),
    },
    donors: {
      title: 'Donor Report',
      headers: ['DTN', 'Name', 'Program', 'Status'],
      rows: data.donors.map((donor) => [donor.dtn, fullName(donor), donor.collectionProgram, donor.status]),
    },
  }

  const report = reports[type]

  return (
    <section>
      <h2>Reports</h2>
      <label>
        Report Type
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="inventory">Inventory Report</option>
          <option value="dispensing">Dispensing Report</option>
          <option value="donors">Donor Report</option>
        </select>
      </label>
      <button onClick={() => window.print()} type="button">Print</button>
      <h3>{report.title}</h3>
      <Table headers={report.headers} rows={report.rows} />
    </section>
  )
}

export default Reports
