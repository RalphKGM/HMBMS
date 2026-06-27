import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const beneficiarySelectColumns =
  "beneficiary_id, first_name, last_name, contact_number, address, is_active, created_by, created_at, updated_at";

const inquirySelectColumns =
  "inquiry_id, beneficiary_id, inquiry_date, status, logged_by, created_at";

export const listBeneficiaries = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const { data, error } = await supabase
      .from("beneficiaries")
      .select(beneficiarySelectColumns)
      .order("beneficiary_id", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ beneficiaries: data || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createBeneficiary = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const { firstName, lastName, contactNumber, address, createdBy } = req.body || {};

  if (!firstName || !lastName || !contactNumber || !address) {
    return res.status(400).json({
      error: "firstName, lastName, contactNumber, and address are required.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("beneficiaries")
      .insert({
        first_name: firstName,
        last_name: lastName,
        contact_number: contactNumber,
        address,
        created_by: createdBy || null,
      })
      .select(beneficiarySelectColumns)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ beneficiary: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateBeneficiary = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const beneficiaryId = Number(req.params.beneficiaryId);
  const { firstName, lastName, contactNumber, address } = req.body || {};

  if (!Number.isInteger(beneficiaryId)) {
    return res.status(400).json({ error: "Invalid beneficiary id." });
  }

  if (!firstName || !lastName || !contactNumber || !address) {
    return res.status(400).json({
      error: "firstName, lastName, contactNumber, and address are required.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("beneficiaries")
      .update({
        first_name: firstName,
        last_name: lastName,
        contact_number: contactNumber,
        address,
      })
      .eq("beneficiary_id", beneficiaryId)
      .select(beneficiarySelectColumns)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ beneficiary: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateBeneficiaryStatus = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const beneficiaryId = Number(req.params.beneficiaryId);
  const { isActive } = req.body || {};

  if (!Number.isInteger(beneficiaryId)) {
    return res.status(400).json({ error: "Invalid beneficiary id." });
  }

  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive must be true or false." });
  }

  try {
    const { data, error } = await supabase
      .from("beneficiaries")
      .update({ is_active: isActive })
      .eq("beneficiary_id", beneficiaryId)
      .select(beneficiarySelectColumns)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ beneficiary: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const listBeneficiaryInquiries = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const beneficiaryId = Number(req.params.beneficiaryId);

  if (!Number.isInteger(beneficiaryId)) {
    return res.status(400).json({ error: "Invalid beneficiary id." });
  }

  try {
    const { data, error } = await supabase
      .from("milk_inquiries")
      .select(inquirySelectColumns)
      .eq("beneficiary_id", beneficiaryId)
      .order("inquiry_date", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ inquiries: data || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createBeneficiaryInquiry = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const beneficiaryId = Number(req.params.beneficiaryId);
  const { loggedBy } = req.body || {};

  if (!Number.isInteger(beneficiaryId)) {
    return res.status(400).json({ error: "Invalid beneficiary id." });
  }

  try {
    const { data, error } = await supabase
      .from("milk_inquiries")
      .insert({
        beneficiary_id: beneficiaryId,
        logged_by: loggedBy || null,
      })
      .select(inquirySelectColumns)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ inquiry: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
