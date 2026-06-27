import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName } from "../utils/helpers";

const defaultMessage =
  "Milk is now available at the milk bank. Please contact staff for confirmation.";

const emptySmsData = {
  beneficiaries: [],
  pendingInquiries: [],
  smsLogs: [],
};

async function fetchSmsData(apiBase) {
  const response = await fetch(`${apiBase}/api/sms`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load SMS data.");
  }

  return {
    ...emptySmsData,
    ...body,
  };
}

function SmsLog({ currentUser }) {
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [smsMessage, setSmsMessage] = useState(defaultMessage);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [pendingInquiries, setPendingInquiries] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const loadSmsData = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchSmsData(apiBase);
      setBeneficiaries(data.beneficiaries);
      setPendingInquiries(data.pendingInquiries);
      setSmsLogs(data.smsLogs);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load SMS data.");
      setBeneficiaries([]);
      setPendingInquiries([]);
      setSmsLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetchSmsData(apiBase)
      .then((data) => {
        if (!isMounted) return;
        setBeneficiaries(data.beneficiaries);
        setPendingInquiries(data.pendingInquiries);
        setSmsLogs(data.smsLogs);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load SMS data.");
        setBeneficiaries([]);
        setPendingInquiries([]);
        setSmsLogs([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const beneficiaryNames = useMemo(() => {
    return beneficiaries.reduce((items, beneficiary) => {
      items[beneficiary.beneficiary_id] = fullName({
        firstName: beneficiary.first_name,
        lastName: beneficiary.last_name,
      });
      return items;
    }, {});
  }, [beneficiaries]);

  const sendSms = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiaryId,
          message: smsMessage,
          sentBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to log simulated SMS.");
      }

      setMessage("Simulated SMS message logged.");
      setBeneficiaryId("");
      await loadSmsData();
    } catch (sendError) {
      setError(sendError.message || "Failed to send simulated SMS.");
    } finally {
      setSaving(false);
    }
  };

  const notifyPending = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/sms/notify-pending`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: defaultMessage,
          sentBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to log simulated notifications.");
      }

      setMessage(`${body.count || 0} simulated notification(s) logged.`);
      await loadSmsData();
    } catch (notifyError) {
      setError(notifyError.message || "Failed to log simulated notifications.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading SMS log...</p>;
  }

  return (
    <section>
      <h2>Simulated SMS Log</h2>
      <p>These entries are simulated only. No real text message is sent.</p>
      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}
      <p>Pending inquiries: {pendingInquiries.length}</p>

      <form onSubmit={sendSms}>
        <label>
          Beneficiary
          <select
            required
            value={beneficiaryId}
            onChange={(event) => setBeneficiaryId(event.target.value)}
          >
            <option value="">Select beneficiary</option>
            {beneficiaries.map((beneficiary) => (
              <option key={beneficiary.beneficiary_id} value={beneficiary.beneficiary_id}>
                {beneficiaryNames[beneficiary.beneficiary_id]} - {beneficiary.contact_number}
              </option>
            ))}
          </select>
        </label>
        <label>
          Message{" "}
          <textarea value={smsMessage} onChange={(event) => setSmsMessage(event.target.value)} />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Logging..." : "Log Simulated SMS"}
        </button>
      </form>

      <button onClick={notifyPending} type="button" disabled={saving}>
        Log Pending Notifications
      </button>
      <Table
        headers={["Recipient", "Message", "Status", "Sent At"]}
        rows={smsLogs.map((log) => [
          beneficiaryNames[log.beneficiary_id] || `Beneficiary #${log.beneficiary_id}`,
          log.message,
          log.delivery_status,
          log.sent_at ? new Date(log.sent_at).toLocaleString() : "Not recorded",
        ])}
      />
    </section>
  );
}

export default SmsLog;
