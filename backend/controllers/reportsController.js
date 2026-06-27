import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export const getReportsData = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const [
      { data: batches, error: batchesError },
      { data: donors, error: donorsError },
      { data: beneficiaries, error: beneficiariesError },
      { data: transactions, error: transactionsError },
    ] = await Promise.all([
      supabase
        .from("milk_batches")
        .select("batch_id, batch_number, available_volume, total_volume, status, expiration_date")
        .order("batch_id", { ascending: false }),
      supabase
        .from("donors")
        .select("donor_id, dtn, first_name, middle_name, last_name, collection_program, status")
        .order("donor_id", { ascending: true }),
      supabase
        .from("beneficiaries")
        .select("beneficiary_id, first_name, last_name")
        .order("beneficiary_id", { ascending: true }),
      supabase
        .from("dispensing_transactions")
        .select("transaction_id, beneficiary_id, batch_id, volume_dispensed, price, transaction_date")
        .order("transaction_date", { ascending: false }),
    ]);

    if (batchesError) return res.status(500).json({ error: batchesError.message });
    if (donorsError) return res.status(500).json({ error: donorsError.message });
    if (beneficiariesError) return res.status(500).json({ error: beneficiariesError.message });
    if (transactionsError) return res.status(500).json({ error: transactionsError.message });

    return res.json({
      batches: batches || [],
      donors: donors || [],
      beneficiaries: beneficiaries || [],
      transactions: transactions || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
