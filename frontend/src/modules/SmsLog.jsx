import { useState } from 'react'
import Table from '../components/Table'
import { fullName, nextId, today } from '../utils/helpers'

function SmsLog({ data, updateData }) {
  const [beneficiaryId, setBeneficiaryId] = useState('')
  const [smsMessage, setSmsMessage] = useState('Milk is now available at the milk bank. Please contact staff for confirmation.')

  function sendSms(event) {
    event.preventDefault()
    const log = {
      id: nextId(data.smsLogs),
      beneficiaryId: Number(beneficiaryId),
      message: smsMessage,
      sentDate: today(),
      status: 'Sent',
    }
    updateData({ ...data, smsLogs: [...data.smsLogs, log] }, 'Simulated SMS sent.')
    setBeneficiaryId('')
  }

  return (
    <section>
      <h2>SMS Log</h2>
      <form onSubmit={sendSms}>
        <label>
          Beneficiary
          <select required value={beneficiaryId} onChange={(event) => setBeneficiaryId(event.target.value)}>
            <option value="">Select</option>
            {data.beneficiaries.map((beneficiary) => (
              <option key={beneficiary.id} value={beneficiary.id}>{fullName(beneficiary)} - {beneficiary.contactNumber}</option>
            ))}
          </select>
        </label>
        <label>Message <textarea value={smsMessage} onChange={(event) => setSmsMessage(event.target.value)} /></label>
        <button type="submit">Send Simulated SMS</button>
      </form>
      <Table
        headers={['Beneficiary', 'Phone Number', 'Message', 'Sent Date', 'Status']}
        rows={data.smsLogs.map((log) => {
          const beneficiary = data.beneficiaries.find((item) => item.id === log.beneficiaryId)
          return [fullName(beneficiary), beneficiary?.contactNumber || '-', log.message, log.sentDate, log.status]
        })}
      />
    </section>
  )
}

export default SmsLog
