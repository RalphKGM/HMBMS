import { useEffect, useMemo, useState } from "react";
import SearchSelect from "../components/SearchSelect";
import Table from "../components/Table";
import { fullName } from "../utils/helpers";

const defaultSubject = "Milk availability notice from Human Milk Bank";
const defaultMessage =
  "Milk is now available at the milk bank. Please contact staff for confirmation.";

const emptyEmailData = {
  beneficiaries: [],
  pendingInquiries: [],
  emailLogs: [],
};

async function fetchEmailData(apiBase) {
  const response = await fetch(`${apiBase}/api/email`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load email data.");
  }

  return {
    ...emptyEmailData,
    ...body,
  };
}

function EmailLog({ currentUser }) {
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [emailMessage, setEmailMessage] = useState(defaultMessage);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [pendingInquiries, setPendingInquiries] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const loadEmailData = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchEmailData(apiBase);
      setBeneficiaries(data.beneficiaries);
      setPendingInquiries(data.pendingInquiries);
      setEmailLogs(data.emailLogs);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load email data.");
      setBeneficiaries([]);
      setPendingInquiries([]);
      setEmailLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetchEmailData(apiBase)
      .then((data) => {
        if (!isMounted) return;
        setBeneficiaries(data.beneficiaries);
        setPendingInquiries(data.pendingInquiries);
        setEmailLogs(data.emailLogs);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load email data.");
        setBeneficiaries([]);
        setPendingInquiries([]);
        setEmailLogs([]);
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

  const beneficiarySearchOptions = useMemo(
    () =>
      beneficiaries
        .filter((beneficiary) => beneficiary.email)
        .map((beneficiary) => ({
          value: beneficiary.beneficiary_id,
          label: beneficiaryNames[beneficiary.beneficiary_id] || `Beneficiary #${beneficiary.beneficiary_id}`,
          description: beneficiary.email || beneficiary.contact_number || "No contact details",
        })),
    [beneficiaries, beneficiaryNames],
  );

  const beneficiaryEmailMap = useMemo(() => {
    return beneficiaries.reduce((items, beneficiary) => {
      items[beneficiary.beneficiary_id] = beneficiary.email || "";
      return items;
    }, {});
  }, [beneficiaries]);

  const pendingNoticeRows = useMemo(() => {
    const grouped = pendingInquiries.reduce((items, inquiry) => {
      const current = items.get(inquiry.beneficiary_id) || {
        beneficiaryId: inquiry.beneficiary_id,
        inquiries: [],
      };

      current.inquiries.push(inquiry);
      items.set(inquiry.beneficiary_id, current);
      return items;
    }, new Map());

    return Array.from(grouped.values()).map((group) => {
      const beneficiaryName = beneficiaryNames[group.beneficiaryId] || `Beneficiary #${group.beneficiaryId}`;
      const emailLabel = beneficiaryEmailMap[group.beneficiaryId] || "No email on file";
      const latestInquiryDate = group.inquiries
        .map((inquiry) => inquiry.inquiry_date)
        .filter(Boolean)
        .sort()
        .at(-1);
      const hasEmail = Boolean(beneficiaryEmailMap[group.beneficiaryId]);

      return [
        <span key={`beneficiary-${group.beneficiaryId}`} className="font-semibold text-slate-900">
          {beneficiaryName}
        </span>,
        emailLabel,
        group.inquiries.length,
        latestInquiryDate || "Not recorded",
        <button
          key={`send-${group.beneficiaryId}`}
          type="button"
          className="min-h-0 border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:border-blue-300 hover:bg-blue-100"
          onClick={() => {
            setBeneficiaryId(String(group.beneficiaryId));
            setSubject(defaultSubject);
            setEmailMessage(defaultMessage);
            setShowEmailModal(true);
          }}
          disabled={!hasEmail}
        >
          {hasEmail ? "Send Email" : "No Email"}
        </button>,
      ];
    });
  }, [beneficiaryEmailMap, beneficiaryNames, pendingInquiries]);

  const filteredEmailLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return emailLogs.filter((log) => {
      const recipient = beneficiaryNames[log.beneficiary_id] || `Beneficiary #${log.beneficiary_id}`;
      const sentAt = log.sent_at ? new Date(log.sent_at).toLocaleString() : "Not recorded";
      const searchableText = [
        recipient,
        log.recipient_email,
        log.subject,
        log.message,
        log.delivery_status,
        sentAt,
        log.error_message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !normalizedSearch || searchableText.includes(normalizedSearch);
    });
  }, [beneficiaryNames, emailLogs, search]);

  const emailStats = useMemo(
    () => [
      {
        label: "Email Logs",
        value: emailLogs.length,
        note: "Messages sent through Resend",
      },
      {
        label: "Pending Inquiries",
        value: pendingInquiries.length,
        note: "Eligible for availability notices",
      },
      {
        label: "Recipients",
        value: beneficiaries.filter((beneficiary) => beneficiary.email).length,
        note: "Beneficiaries with email addresses",
      },
    ],
    [beneficiaries, emailLogs.length, pendingInquiries.length],
  );

  const closeEmailModal = () => {
    if (saving) return;
    setShowEmailModal(false);
    setBeneficiaryId("");
    setSubject(defaultSubject);
    setEmailMessage(defaultMessage);
  };

  const closeNotifyConfirm = () => {
    if (saving) return;
    setShowNotifyConfirm(false);
  };

  const openCustomEmailModal = () => {
    setBeneficiaryId("");
    setSubject(defaultSubject);
    setEmailMessage(defaultMessage);
    setShowEmailModal(true);
  };

  const sendEmail = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiaryId,
          subject,
          message: emailMessage,
          sentBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to send email.");
      }

      setMessage("Email sent and logged.");
      setBeneficiaryId("");
      setShowEmailModal(false);
      await loadEmailData();
    } catch (sendError) {
      setError(sendError.message || "Failed to send email.");
    } finally {
      setSaving(false);
    }
  };

  const notifyPending = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/email/notify-pending`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: defaultSubject,
          message: defaultMessage,
          sentBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to send pending email notices.");
      }

      const successCount = body.count || 0;
      const failedCount = body.failedCount || 0;
      setMessage(
        failedCount > 0
          ? `${successCount} email(s) sent, ${failedCount} failed and were logged.`
          : `${successCount} email(s) sent and logged.`,
      );
      setShowNotifyConfirm(false);
      await loadEmailData();
    } catch (notifyError) {
      setError(notifyError.message || "Failed to send pending email notices.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading email log...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Email Log</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Send real beneficiary notifications through Resend and track every email delivery attempt.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {emailStats.map((stat) => (
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

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Custom Email
          </p>
          <h3 className="mt-3">Send a specific email</h3>
          <p className="mt-2 text-sm">
            Select a beneficiary with an email address, then write the message you want to send.
          </p>
          <button
            type="button"
            className="mt-4 border-blue-600 bg-blue-600 px-4 text-white hover:border-blue-700 hover:bg-blue-700"
            onClick={openCustomEmailModal}
          >
            Compose Email
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Quick Notice
          </p>
          <h3 className="mt-3">Notify pending inquiries</h3>
          <p className="mt-2 text-sm">
            Send the default availability notice to all pending inquiries and log each email attempt.
          </p>
          <button
            type="button"
            className="mt-4 border-blue-600 bg-blue-600 px-4 text-white hover:border-blue-700 hover:bg-blue-700"
            onClick={() => setShowNotifyConfirm(true)}
            disabled={saving}
          >
            {saving ? "Sending..." : "Notify All Pending"}
          </button>
        </article>
      </div>

      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>Custom Email</h3>
                <p className="mt-1 text-sm">
                  Choose a beneficiary and write the email you want to send.
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closeEmailModal}
                aria-label="Close email modal"
              >
                X
              </button>
            </div>
            <form onSubmit={sendEmail}>
              <SearchSelect
                label="Beneficiary"
                required
                value={beneficiaryId}
                options={beneficiarySearchOptions}
                placeholder="Type beneficiary name or email"
                onChange={setBeneficiaryId}
              />
              <label>
                Subject
                <input
                  required
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Email subject"
                />
              </label>
              <label className="sm:col-span-2 xl:col-span-3">
                Message
                <textarea value={emailMessage} onChange={(event) => setEmailMessage(event.target.value)} />
              </label>
              <div className="flex flex-wrap justify-end gap-3 sm:col-span-2 xl:col-span-3">
                <button type="button" onClick={closeEmailModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNotifyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                  Confirm Action
                </p>
                <h3 className="mt-2 font-bold mb-5">Notify all pending inquiries?</h3>
                <p className="mt-1 text-sm">
                  This will send the default availability notice to every pending inquiry and mark
                  those inquiries as fulfilled after successful delivery.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={closeNotifyConfirm} disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                className="border-amber-600 bg-amber-600 text-white hover:border-amber-700 hover:bg-amber-700"
                onClick={notifyPending}
                disabled={saving || !pendingInquiries.length}
              >
                {saving ? "Sending..." : "Yes, Notify All"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Pending Email Notices</h3>
            <p className="mt-1 text-sm">
              Review pending inquiries and send an email to the beneficiary when needed.
            </p>
          </div>
        </div>
        <Table
          headers={["Beneficiary", "Email", "Pending Requests", "Latest Inquiry", "Action"]}
          rows={pendingNoticeRows}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Email Logs</h3>
            <p className="mt-1 text-sm">Review all emails sent through Resend.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {filteredEmailLogs.length} of {emailLogs.length}{" "}
            {emailLogs.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className="mb-4 max-w-xs">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search recipient, subject, or date"
            />
          </label>
        </div>
        <Table
          headers={["Recipient", "Subject", "Status", "Sent At"]}
          rows={filteredEmailLogs.map((log) => [
            <span key={`recipient-${log.email_id}`} className="font-semibold text-slate-900">
              {beneficiaryNames[log.beneficiary_id] || `Beneficiary #${log.beneficiary_id}`}
            </span>,
            log.subject,
            <span
              key={`status-${log.email_id}`}
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                log.delivery_status === "Failed"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
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

export default EmailLog;
