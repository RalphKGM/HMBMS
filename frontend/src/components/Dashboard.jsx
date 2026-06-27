import Table from './Table'

function Dashboard({ data }) {
  const availableMilk = data.batches
    .filter((batch) => batch.status === 'Available')
    .reduce((total, batch) => total + Number(batch.availableVolume), 0)
  const availableBatches = data.batches.filter((batch) => batch.status === 'Available').length
  const disposedBatches = data.batches.filter((batch) => batch.status === 'Disposed')
  const pendingInquiries = data.inquiries.filter((inquiry) => inquiry.status === 'Pending').length
  const lowInventory = data.batches.filter((batch) => batch.status === 'Available' && Number(batch.availableVolume) <= 250)
  const expiringBatches = data.batches.filter((batch) => batch.expirationDate)

  const stats = [
    ['Total Donors', data.donors.length],
    ['Active Donors', data.donors.filter((donor) => donor.status === 'Active').length],
    ['Total Beneficiaries', data.beneficiaries.length],
    ['Active Beneficiaries', data.beneficiaries.filter((beneficiary) => beneficiary.isActive !== false).length],
    ['Available Milk', `${availableMilk} mL`],
    ['Available Batches', availableBatches],
    ['Pending Pasteurization', data.batches.filter((batch) => batch.status === 'Pending Pasteurization' || batch.status === 'Pending Lab').length],
    ['Pending Inquiries', pendingInquiries],
    ['Milk Dispensed', data.transactions.reduce((total, transaction) => total + Number(transaction.volumeDispensed || 0), 0)],
    ['Disposed Milk', `${disposedBatches.length} batches / ${disposedBatches.reduce((total, batch) => total + Number(batch.totalVolume || 0), 0)} mL`],
    ['SMS Sent', data.smsLogs.length],
  ]

  const recentActivities = [
    ...data.transactions.slice(-3).map((transaction) => ({
      text: `Dispensed ${transaction.volumeDispensed} mL on ${transaction.transactionDate}`,
      date: transaction.transactionDate,
    })),
    ...data.inquiries.slice(-3).map((inquiry) => ({
      text: `Inquiry ${inquiry.status} for beneficiary #${inquiry.beneficiaryId}`,
      date: inquiry.smsDate || inquiry.inquiryDate,
    })),
  ].slice(-5).reverse()

  return (
    <section>
      <h2>Dashboard</h2>
      <div className="dashboard-grid">
        {stats.map(([label, value]) => (
          <div key={label} className="dashboard-card">
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <h3>Recent Activities</h3>
      <Table headers={['Activity', 'Date']} rows={recentActivities.map((item) => [item.text, item.date])} />

      <h3>Warnings</h3>
      {lowInventory.length === 0 ? <p>No low inventory batches.</p> : <Table headers={['Batch', 'Available Volume']} rows={lowInventory.map((batch) => [batch.batchNumber, `${batch.availableVolume} mL`])} />}

      <h3>Expiring Batches</h3>
      {expiringBatches.length === 0 ? <p>No batches with expiration dates.</p> : <Table headers={['Batch', 'Status', 'Expiration Date']} rows={expiringBatches.map((batch) => [batch.batchNumber, batch.status, batch.expirationDate])} />}
    </section>
  )
}

export default Dashboard
