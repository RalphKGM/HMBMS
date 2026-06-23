import { useState } from 'react'
import Table from '../components/Table'
import { fullName, nextId } from '../utils/helpers'

function SmsLog({ currentUser, data, updateData }) {
  const [beneficiaryId, setBeneficiaryId] = useState('')
  const [smsMessage, setSmsMessage] = useState('Milk is now available at the milk bank. Please contact staff for confirmation.')

  function sendSms(event) {
    event.preventDefault()
    const log = {
      id: nextId(data.smsLogs),
      beneficiaryId: Number(beneficiaryId),
      message: smsMessage,
      sentBy: currentUser.id,
      sentAt: new Date().toLocaleString(),
      deliveryStatus: 'Sent',
    }
    updateData({ ...data, smsLogs: [...data.smsLogs, log] }, 'Simulated SMS sent.')
    setBeneficiaryId('')
  }

  function notifyPending() {
    const pending = data.inquiries.filter((inquiry) => inquiry.status === 'Pending')
    const logs = pending.map((inquiry, index) => ({
      id: nextId(data.smsLogs) + index,
      beneficiaryId: inquiry.beneficiaryId,
      message: 'Milk is now available at the milk bank. Please contact staff for confirmation.',
      sentBy: currentUser.id,
      sentAt: new Date().toLocaleString(),
      deliveryStatus: 'Sent',
    }))
    updateData({ ...data, smsLogs: [...data.smsLogs, ...logs] }, `${logs.length} pending notification(s) logged.`)
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
      <button onClick={notifyPending} type="button">Notify Pending Inquiries</button>
      <Table
        headers={['Recipient', 'Message', 'Status', 'Sent At']}
        rows={data.smsLogs.map((log) => {
          const beneficiary = data.beneficiaries.find((item) => item.id === log.beneficiaryId)
          return [fullName(beneficiary), log.message, log.deliveryStatus, log.sentAt]
        })}
      />
    </section>
  )
}

export default SmsLog
