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
      { data: collections, error: collectionsError },
      { data: pasteurizationRecords, error: pasteurizationError },
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
        .from("milk_collections")
        .select("collection_id, batch_id, donor_id, collection_type, collection_date, volume_ml, status")
        .order("collection_date", { ascending: false }),
      supabase
        .from("pasteurization_records")
        .select("pasteurization_id, batch_id, pre_test_result, pre_test_date, post_test_result, post_test_date, expiration_date")
        .order("pasteurization_id", { ascending: false }),
      supabase
        .from("dispensing_transactions")
        .select("transaction_id, beneficiary_id, batch_id, volume_dispensed, price, transaction_date")
        .order("transaction_date", { ascending: false }),
    ]);

    if (batchesError) return res.status(500).json({ error: batchesError.message });
    if (donorsError) return res.status(500).json({ error: donorsError.message });
    if (beneficiariesError) return res.status(500).json({ error: beneficiariesError.message });
    if (collectionsError) return res.status(500).json({ error: collectionsError.message });
    if (pasteurizationError) return res.status(500).json({ error: pasteurizationError.message });
    if (transactionsError) return res.status(500).json({ error: transactionsError.message });

    return res.json({
      batches: batches || [],
      donors: donors || [],
      beneficiaries: beneficiaries || [],
      collections: collections || [],
      pasteurizationRecords: pasteurizationRecords || [],
      transactions: transactions || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
