import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const beneficiarySelectColumns =
  "beneficiary_id, first_name, last_name, contact_number, is_active";

const inquirySelectColumns =
  "inquiry_id, beneficiary_id, requested_volume_ml, inquiry_date, status";

const smsSelectColumns =
  "sms_id, beneficiary_id, message, sent_by, sent_at, delivery_status, created_at";

export const SIMULATED_AVAILABLE_MESSAGE =
  "Milk is now available at the milk bank. Please contact staff for confirmation.";

export const logPendingInquirySms = async ({ message, sentBy } = {}) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase not configured on server.");
  }

  const smsMessage = message || SIMULATED_AVAILABLE_MESSAGE;

  const { data: pendingInquiries, error: inquiriesError } = await supabase
    .from("milk_inquiries")
    .select(inquirySelectColumns)
    .eq("status", "Pending");

  if (inquiriesError) {
    throw new Error(inquiriesError.message);
  }

  const logs = (pendingInquiries || []).map((inquiry) => ({
    beneficiary_id: inquiry.beneficiary_id,
    message: smsMessage,
    sent_by: sentBy || null,
    delivery_status: "Sent",
  }));

  if (!logs.length) {
    return { smsLogs: [], count: 0 };
  }

  const { data, error } = await supabase
    .from("sms_logs")
    .insert(logs)
    .select(smsSelectColumns);

  if (error) {
    throw new Error(error.message);
  }

  return {
    smsLogs: data || [],
    count: data?.length || 0,
  };
};

export const listSmsData = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const [
      { data: beneficiaries, error: beneficiariesError },
      { data: pendingInquiries, error: inquiriesError },
      { data: smsLogs, error: logsError },
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
        .from("sms_logs")
        .select(smsSelectColumns)
        .order("sent_at", { ascending: false }),
    ]);

    if (beneficiariesError) return res.status(500).json({ error: beneficiariesError.message });
    if (inquiriesError) return res.status(500).json({ error: inquiriesError.message });
    if (logsError) return res.status(500).json({ error: logsError.message });

    return res.json({
      beneficiaries: beneficiaries || [],
      pendingInquiries: pendingInquiries || [],
      smsLogs: smsLogs || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createSmsLog = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const { beneficiaryId, message, sentBy } = req.body || {};
  const parsedBeneficiaryId = Number(beneficiaryId);

  if (!Number.isInteger(parsedBeneficiaryId) || !message) {
    return res.status(400).json({ error: "beneficiaryId and message are required." });
  }

  try {
    const { data, error } = await supabase
      .from("sms_logs")
      .insert({
        beneficiary_id: parsedBeneficiaryId,
        message,
        sent_by: sentBy || null,
        delivery_status: "Sent",
      })
      .select(smsSelectColumns)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ smsLog: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const notifyPendingInquiries = async (req, res) => {
  const { message, sentBy } = req.body || {};

  try {
    const result = await logPendingInquirySms({ message, sentBy });
    return res.status(201).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
