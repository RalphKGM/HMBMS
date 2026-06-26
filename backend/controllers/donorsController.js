import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const donorSelectColumns =
  "donor_id, dtn, first_name, middle_name, last_name, birthdate, address, contact_number, collection_program, status, created_by, created_at, updated_at";

export const listDonors = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const { data, error } = await supabase
      .from("donors")
      .select(donorSelectColumns)
      .order("donor_id", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ donors: data || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createDonor = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const {
    firstName,
    middleName,
    lastName,
    birthdate,
    address,
    contactNumber,
    collectionProgram,
    createdBy,
  } = req.body || {};

  if (!firstName || !lastName || !birthdate || !address || !contactNumber) {
    return res.status(400).json({
      error:
        "firstName, lastName, birthdate, address, and contactNumber are required.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("donors")
      .insert({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        birthdate,
        address,
        contact_number: contactNumber,
        collection_program: collectionProgram || null,
        created_by: createdBy || null,
      })
      .select(donorSelectColumns)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ donor: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateDonorStatus = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const donorId = Number(req.params.donorId);
  const { status } = req.body || {};

  if (!Number.isInteger(donorId)) {
    return res.status(400).json({ error: "Invalid donor id." });
  }

  if (!status || !["Active", "Inactive"].includes(status)) {
    return res.status(400).json({ error: "status must be Active or Inactive." });
  }

  try {
    const { data, error } = await supabase
      .from("donors")
      .update({ status })
      .eq("donor_id", donorId)
      .select(donorSelectColumns)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ donor: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};