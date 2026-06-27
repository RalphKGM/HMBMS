import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export const getDashboardSummary = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const [
      { data: donors, error: donorsError },
      { data: beneficiaries, error: beneficiariesError },
      { data: inquiries, error: inquiriesError },
      { data: availableBatches, error: batchesError },
      { data: allBatches, error: allBatchesError },
    ] = await Promise.all([
      supabase.from("donors").select("donor_id"),
      supabase.from("beneficiaries").select("beneficiary_id"),
      supabase.from("milk_inquiries").select("inquiry_id").eq("status", "Pending"),
      supabase
        .from("milk_batches")
        .select("batch_id, batch_number, total_volume, available_volume, status, expiration_date")
        .eq("status", "Available")
        .gt("available_volume", 0)
        .order("expiration_date", { ascending: true }),
      supabase.from("milk_batches").select("batch_id, status"),
    ]);

    if (donorsError) return res.status(500).json({ error: donorsError.message });
    if (beneficiariesError) return res.status(500).json({ error: beneficiariesError.message });
    if (inquiriesError) return res.status(500).json({ error: inquiriesError.message });
    if (batchesError) return res.status(500).json({ error: batchesError.message });
    if (allBatchesError) return res.status(500).json({ error: allBatchesError.message });

    const availableMilk = (availableBatches || []).reduce(
      (total, batch) => total + Number(batch.available_volume || 0),
      0,
    );

    return res.json({
      availableMilk,
      donorCount: donors?.length || 0,
      beneficiaryCount: beneficiaries?.length || 0,
      pendingInquiryCount: inquiries?.length || 0,
      pasteurizationCount: (allBatches || []).filter((batch) =>
        ["Pending Lab", "Passed", "Pasteurized"].includes(batch.status),
      ).length,
      availableBatches: availableBatches || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
