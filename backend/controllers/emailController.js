import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const beneficiarySelectColumns =
  "beneficiary_id, first_name, last_name, contact_number, email, is_active";

const inquirySelectColumns =
  "inquiry_id, beneficiary_id, requested_volume_ml, inquiry_date, status";

const emailSelectColumns =
  "email_id, beneficiary_id, recipient_email, subject, message, resend_id, error_message, sent_by, sent_at, delivery_status, created_at";

const defaultEmailSubject = "Milk availability notice from Human Milk Bank";
export const SIMULATED_AVAILABLE_EMAIL_MESSAGE =
  "Milk is now available at the milk bank. Please contact staff for confirmation.";

function logEmailEvent(event, details = {}) {
  console.log(`[email] ${event}`, {
    ...details,
    at: new Date().toISOString(),
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEmailHtml(message) {
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;"><p>${safeMessage}</p></div>`;
}

function formatSender(fromEmail) {
  const trimmedFromEmail = String(fromEmail || "").trim();
  if (!trimmedFromEmail) return "";
  if (trimmedFromEmail.includes("<") && trimmedFromEmail.includes(">")) return trimmedFromEmail;
  return `MilkLink <${trimmedFromEmail}>`;
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = formatSender(process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM);

  if (!apiKey || !fromEmail) {
    logEmailEvent("config-missing", {
      hasApiKey: Boolean(apiKey),
      hasFromEmail: Boolean(fromEmail),
    });
    throw new Error("Resend is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to .env.");
  }

  return { apiKey, fromEmail };
}

async function sendResendEmail({ to, subject, message }) {
  const { apiKey, fromEmail } = getResendConfig();

  logEmailEvent("resend-request", {
    to,
    from: fromEmail,
    subject,
    messageLength: String(message || "").length,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html: formatEmailHtml(message),
      text: message,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || "Failed to send email.";
    logEmailEvent("resend-rejected", {
      to,
      status: response.status,
      error: errorMessage,
    });
    throw new Error(errorMessage);
  }

  logEmailEvent("resend-accepted", {
    to,
    status: response.status,
    resendId: data?.id || null,
  });

  return data;
}

function groupPendingInquiries(pendingInquiries = [], beneficiaries = []) {
  const beneficiaryById = new Map(
    beneficiaries.map((beneficiary) => [beneficiary.beneficiary_id, beneficiary]),
  );
  const groups = new Map();

  for (const inquiry of pendingInquiries) {
    const beneficiary = beneficiaryById.get(inquiry.beneficiary_id);
    if (!beneficiary) continue;

    const current = groups.get(beneficiary.beneficiary_id) || {
      beneficiary,
      inquiries: [],
      inquiryIds: [],
    };

    current.inquiries.push(inquiry);
    current.inquiryIds.push(inquiry.inquiry_id);
    groups.set(beneficiary.beneficiary_id, current);
  }

  return Array.from(groups.values());
}

async function insertEmailLog({
  beneficiaryId,
  recipientEmail,
  subject,
  message,
  sentBy,
  resendId = null,
  errorMessage = null,
  deliveryStatus = "Sent",
}) {
  logEmailEvent("db-log-insert", {
    beneficiaryId,
    recipientEmail: recipientEmail || null,
    deliveryStatus,
    resendId,
    hasError: Boolean(errorMessage),
  });

  const { data, error } = await supabase
    .from("email_logs")
    .insert({
      beneficiary_id: beneficiaryId,
      recipient_email: recipientEmail || null,
      subject,
      message,
      resend_id: resendId,
      error_message: errorMessage,
      sent_by: sentBy || null,
      delivery_status: deliveryStatus,
    })
    .select(emailSelectColumns)
    .single();

  if (error) {
    logEmailEvent("db-log-failed", {
      beneficiaryId,
      recipientEmail: recipientEmail || null,
      deliveryStatus,
      error: error.message,
    });
    throw new Error(error.message);
  }

  logEmailEvent("db-log-saved", {
    emailId: data.email_id,
    beneficiaryId,
    deliveryStatus,
  });

  return data;
}

async function fulfillInquiries(inquiryIds = []) {
  if (!inquiryIds.length) return;

  const { error } = await supabase
    .from("milk_inquiries")
    .update({ status: "Fulfilled" })
    .in("inquiry_id", inquiryIds);

  if (error) {
    throw new Error(error.message);
  }
}

async function deliverEmailForBeneficiary({ beneficiary, message, subject, sentBy, inquiryIds }) {
  const recipientEmail = beneficiary.email || null;

  logEmailEvent("delivery-start", {
    beneficiaryId: beneficiary.beneficiary_id,
    recipientEmail,
    subject,
    inquiryCount: inquiryIds?.length || 0,
    sentBy: sentBy || null,
  });

  if (!recipientEmail) {
    const failedLog = await insertEmailLog({
      beneficiaryId: beneficiary.beneficiary_id,
      recipientEmail: null,
      subject,
      message,
      sentBy,
      deliveryStatus: "Failed",
      errorMessage: "Beneficiary email address is missing.",
    });

    logEmailEvent("delivery-skipped", {
      beneficiaryId: beneficiary.beneficiary_id,
      reason: "missing-email",
      emailId: failedLog.email_id,
    });

    return { log: failedLog, sent: false };
  }

  try {
    const resendResponse = await sendResendEmail({
      to: recipientEmail,
      subject,
      message,
    });

    const log = await insertEmailLog({
      beneficiaryId: beneficiary.beneficiary_id,
      recipientEmail,
      subject,
      message,
      sentBy,
      resendId: resendResponse?.id || null,
      deliveryStatus: "Sent",
    });

    try {
      await fulfillInquiries(inquiryIds);
    } catch (inquiryError) {
      console.error("Failed to update inquiry status after sending email:", inquiryError);
    }

    logEmailEvent("delivery-sent", {
      beneficiaryId: beneficiary.beneficiary_id,
      recipientEmail,
      emailId: log.email_id,
      resendId: log.resend_id,
    });

    return { log, sent: true };
  } catch (sendError) {
    const failedLog = await insertEmailLog({
      beneficiaryId: beneficiary.beneficiary_id,
      recipientEmail,
      subject,
      message,
      sentBy,
      deliveryStatus: "Failed",
      errorMessage: sendError.message,
    });

    logEmailEvent("delivery-failed", {
      beneficiaryId: beneficiary.beneficiary_id,
      recipientEmail,
      emailId: failedLog.email_id,
      error: sendError.message,
    });

    return { log: failedLog, sent: false, error: sendError };
  }
}

export async function sendPendingInquiryEmails({ subject, message, sentBy } = {}) {
  const emailSubject = subject || defaultEmailSubject;
  const emailMessage = message || SIMULATED_AVAILABLE_EMAIL_MESSAGE;

  logEmailEvent("notify-pending-start", {
    subject: emailSubject,
    sentBy: sentBy || null,
  });

  const [
    { data: beneficiaries, error: beneficiariesError },
    { data: pendingInquiries, error: inquiriesError },
  ] = await Promise.all([
    supabase
      .from("beneficiaries")
      .select(beneficiarySelectColumns)
      .eq("is_active", true)
      .order("beneficiary_id", { ascending: true }),
    supabase
      .from("milk_inquiries")
      .select(inquirySelectColumns)
      .eq("status", "Pending")
      .order("inquiry_date", { ascending: true })
      .order("inquiry_id", { ascending: true }),
  ]);

  if (beneficiariesError) {
    throw new Error(beneficiariesError.message);
  }

  if (inquiriesError) {
    throw new Error(inquiriesError.message);
  }

  const groups = groupPendingInquiries(pendingInquiries || [], beneficiaries || []);
  logEmailEvent("notify-pending-recipients", {
    pendingInquiryCount: pendingInquiries?.length || 0,
    recipientCount: groups.length,
  });

  const logs = [];
  let failedCount = 0;

  for (const group of groups) {
    const { log, sent } = await deliverEmailForBeneficiary({
      beneficiary: group.beneficiary,
      message: emailMessage,
      subject: emailSubject,
      sentBy,
      inquiryIds: group.inquiryIds,
    });

    logs.push(log);
    if (!sent) failedCount += 1;
  }

  const result = {
    emailLogs: logs,
    count: logs.length - failedCount,
    failedCount,
  };

  logEmailEvent("notify-pending-complete", {
    sentCount: result.count,
    failedCount: result.failedCount,
  });

  return result;
}

export const listEmailData = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const [
      { data: beneficiaries, error: beneficiariesError },
      { data: pendingInquiries, error: inquiriesError },
      { data: emailLogs, error: logsError },
    ] = await Promise.all([
      supabase
        .from("beneficiaries")
        .select(beneficiarySelectColumns)
        .eq("is_active", true)
        .order("beneficiary_id", { ascending: true }),
      supabase
        .from("milk_inquiries")
        .select(inquirySelectColumns)
        .eq("status", "Pending")
        .order("inquiry_date", { ascending: true }),
      supabase
        .from("email_logs")
        .select(emailSelectColumns)
        .order("sent_at", { ascending: false }),
    ]);

    if (beneficiariesError) return res.status(500).json({ error: beneficiariesError.message });
    if (inquiriesError) return res.status(500).json({ error: inquiriesError.message });
    if (logsError) return res.status(500).json({ error: logsError.message });

    return res.json({
      beneficiaries: beneficiaries || [],
      pendingInquiries: pendingInquiries || [],
      emailLogs: emailLogs || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createEmailLog = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const { beneficiaryId, subject, message, sentBy } = req.body || {};
  const parsedBeneficiaryId = Number(beneficiaryId);

  if (!Number.isInteger(parsedBeneficiaryId) || !subject || !message) {
    return res.status(400).json({ error: "beneficiaryId, subject, and message are required." });
  }

  try {
    const { data: beneficiary, error: beneficiaryError } = await supabase
      .from("beneficiaries")
      .select(beneficiarySelectColumns)
      .eq("beneficiary_id", parsedBeneficiaryId)
      .single();

    if (beneficiaryError) {
      return res.status(500).json({ error: beneficiaryError.message });
    }

    const { data: pendingInquiries, error: inquiriesError } = await supabase
      .from("milk_inquiries")
      .select(inquirySelectColumns)
      .eq("beneficiary_id", parsedBeneficiaryId)
      .eq("status", "Pending");

    if (inquiriesError) {
      return res.status(500).json({ error: inquiriesError.message });
    }

    const result = await deliverEmailForBeneficiary({
      beneficiary,
      message,
      subject,
      sentBy,
      inquiryIds: (pendingInquiries || []).map((inquiry) => inquiry.inquiry_id),
    });

    if (!result.sent) {
      return res.status(500).json({
        error: result.error?.message || "Failed to send email.",
        emailLog: result.log,
      });
    }

    return res.status(201).json({ emailLog: result.log });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const notifyPendingInquiries = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const { subject, message, sentBy } = req.body || {};

  try {
    const result = await sendPendingInquiryEmails({ subject, message, sentBy });

    if (!result.emailLogs.length) {
      return res.status(200).json({ emailLogs: [], count: 0, failedCount: 0 });
    }

    return res.status(201).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
