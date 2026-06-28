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
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [search, setSearch] = useState("");
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

  const filteredSmsLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return smsLogs.filter((log) => {
      const recipient = beneficiaryNames[log.beneficiary_id] || `Beneficiary #${log.beneficiary_id}`;
      const sentAt = log.sent_at ? new Date(log.sent_at).toLocaleString() : "Not recorded";
      const searchableText = [
        recipient,
        log.message,
        log.delivery_status,
        sentAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !normalizedSearch || searchableText.includes(normalizedSearch);
    });
  }, [beneficiaryNames, search, smsLogs]);

  const smsStats = useMemo(
    () => [
      {
        label: "SMS Logs",
        value: smsLogs.length,
        note: "Simulated messages recorded",
      },
      {
        label: "Pending Inquiries",
        value: pendingInquiries.length,
        note: "Can receive availability notice",
      },
      {
        label: "Recipients",
        value: beneficiaries.length,
        note: "Active beneficiaries",
      },
    ],
    [beneficiaries.length, pendingInquiries.length, smsLogs.length],
  );

  const closeSmsModal = () => {
    if (saving) return;
    setShowSmsModal(false);
    setBeneficiaryId("");
    setSmsMessage(defaultMessage);
  };

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
      setShowSmsModal(false);
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
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading SMS log...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>SMS Log</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Track simulated mother notifications. No real text message is sent.
            </p>
          </div>
          <button
            type="button"
            className="border-blue-600 bg-blue-600 px-4 text-white hover:border-blue-700 hover:bg-blue-700"
            onClick={() => setShowSmsModal(true)}
          >
            Log SMS
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {smsStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[#003b90]">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-500">{stat.note}</p>
          </article>
        ))}
      </div>

      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>Log Simulated SMS</h3>
                <p className="mt-1 text-sm">
                  This records the SMS message only. It does not send an actual text.
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closeSmsModal}
                aria-label="Close SMS modal"
              >
                X
              </button>
            </div>
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
              <label className="sm:col-span-2 xl:col-span-3">
                Message
                <textarea value={smsMessage} onChange={(event) => setSmsMessage(event.target.value)} />
              </label>
              <div className="flex flex-wrap justify-end gap-3 sm:col-span-2 xl:col-span-3">
                <button type="button" onClick={closeSmsModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Logging..." : "Log Simulated SMS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Pending Availability Notices</h3>
            <p className="mt-1 text-sm">
              Log one simulated availability message for each pending inquiry.
            </p>
          </div>
          <button onClick={notifyPending} type="button" disabled={saving}>
            {saving ? "Logging..." : "Log Pending Notifications"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>SMS Logs</h3>
            <p className="mt-1 text-sm">
              Review all simulated SMS notifications recorded by the system.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {filteredSmsLogs.length} of {smsLogs.length} {smsLogs.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className="mb-4 max-w-xs">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search recipient, message, or date"
            />
          </label>
        </div>
        <Table
          headers={["Recipient", "Message", "Status", "Sent At"]}
          rows={filteredSmsLogs.map((log) => [
            <span key={`recipient-${log.sms_id}`} className="font-semibold text-slate-900">
              {beneficiaryNames[log.beneficiary_id] || `Beneficiary #${log.beneficiary_id}`}
            </span>,
            log.message,
            <span
              key={`status-${log.sms_id}`}
              className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
            >
              {log.delivery_status}
            </span>,
            log.sent_at ? new Date(log.sent_at).toLocaleString() : "Not recorded",
          ])}
        />
      </div>
    </section>
  );
}

export default SmsLog;
