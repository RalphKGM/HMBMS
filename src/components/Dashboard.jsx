import Table from './Table'

function Dashboard({ data }) {
  const availableMilk = data.batches.reduce((total, batch) => total + Number(batch.availableVolume), 0)
  const pending = data.inquiries.filter((inquiry) => inquiry.status === 'Pending').length

  return (
    <section>
      <h2>Dashboard</h2>
      <p>Available milk: {availableMilk} mL</p>
      <p>Total donors: {data.donors.length}</p>
      <p>Total beneficiaries: {data.beneficiaries.length}</p>
      <p>Pending inquiries: {pending}</p>

      <h3>Available Batches</h3>
      <Table
        headers={['Batch Number', 'Available Volume', 'Status', 'Expiration Date']}
        rows={data.batches
          .filter((batch) => batch.status === 'Available')
          .map((batch) => [
            batch.batchNumber,
            `${batch.availableVolume} mL`,
            batch.status,
            batch.expirationDate || 'Not set',
          ])}
      />
    </section>
  )
}

export default Dashboard
