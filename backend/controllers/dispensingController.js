import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const batchSelectColumns =
  "batch_id, batch_number, total_volume, available_volume, status, expiration_date, created_at";

const transactionSelectColumns =
  "transaction_id, beneficiary_id, batch_id, volume_dispensed, price, dispensed_by, transaction_date, created_at";

export const listDispensingData = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const [
      { data: batches, error: batchesError },
      { data: transactions, error: transactionsError },
    ] = await Promise.all([
      supabase
        .from("milk_batches")
        .select(batchSelectColumns)
        .eq("status", "Available")
        .gt("available_volume", 0)
        .order("expiration_date", { ascending: true }),
      supabase
        .from("dispensing_transactions")
        .select(transactionSelectColumns)
        .order("transaction_date", { ascending: false }),
    ]);

    if (batchesError) return res.status(500).json({ error: batchesError.message });
    if (transactionsError) return res.status(500).json({ error: transactionsError.message });

    return res.json({
      batches: batches || [],
      transactions: transactions || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createDispensingTransaction = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const { beneficiaryId, batchId, volumeDispensed, price, dispensedBy } = req.body || {};
  const parsedBeneficiaryId = Number(beneficiaryId);
  const parsedBatchId = Number(batchId);
  const volume = Number(volumeDispensed);
  const amount = Number(price || 0);

  if (
    !Number.isInteger(parsedBeneficiaryId) ||
    parsedBeneficiaryId <= 0 ||
    !Number.isInteger(parsedBatchId) ||
    parsedBatchId <= 0 ||
    !volume ||
    volume <= 0
  ) {
    return res.status(400).json({
      error: "beneficiaryId, batchId, and positive volumeDispensed are required.",
    });
  }

  try {
    const transactionsToInsert = [];

    if (Number.isInteger(parsedBatchId)) {
      const { data: batch, error: batchError } = await supabase
        .from("milk_batches")
        .select(batchSelectColumns)
        .eq("batch_id", parsedBatchId)
        .single();

      if (batchError) {
        return res.status(500).json({ error: batchError.message });
      }

      if (batch.status !== "Available" || Number(batch.available_volume) < volume) {
        return res.status(400).json({ error: "Selected batch has insufficient available milk." });
      }

      transactionsToInsert.push({
        beneficiary_id: parsedBeneficiaryId,
        batch_id: parsedBatchId,
        volume_dispensed: volume,
        price: amount,
        dispensed_by: dispensedBy || null,
      });
    } else {
      const { data: availableBatches, error: batchesError } = await supabase
        .from("milk_batches")
        .select(batchSelectColumns)
        .eq("status", "Available")
        .gt("available_volume", 0)
        .order("expiration_date", { ascending: true, nullsFirst: false })
        .order("batch_id", { ascending: true });

      if (batchesError) {
        return res.status(500).json({ error: batchesError.message });
      }

      let remaining = volume;
      for (const batch of availableBatches || []) {
        if (remaining <= 0) break;

        const available = Number(batch.available_volume || 0);
        const allocated = Math.min(available, remaining);

        if (allocated > 0) {
          transactionsToInsert.push({
            beneficiary_id: parsedBeneficiaryId,
            batch_id: batch.batch_id,
            volume_dispensed: allocated,
            price: amount,
            dispensed_by: dispensedBy || null,
          });
          remaining -= allocated;
        }
      }

      if (remaining > 0) {
        return res.status(400).json({
          error: "Not enough available milk across all batches to fulfill this request.",
        });
      }
    }

    if (transactionsToInsert.length > 1 && amount > 0) {
      let allocatedPrice = 0;
      transactionsToInsert.forEach((entry, index) => {
        if (index === transactionsToInsert.length - 1) {
          entry.price = Number((amount - allocatedPrice).toFixed(2));
          return;
        }

        const share = Number(((amount * entry.volume_dispensed) / volume).toFixed(2));
        entry.price = share;
        allocatedPrice += share;
      });
    }

    const { data: transactions, error: transactionError } = await supabase
      .from("dispensing_transactions")
      .insert(transactionsToInsert)
      .select(transactionSelectColumns);

    if (transactionError) {
      return res.status(500).json({ error: transactionError.message });
    }

    await supabase
      .from("milk_inquiries")
      .update({ status: "Fulfilled" })
      .eq("beneficiary_id", parsedBeneficiaryId)
      .eq("status", "Pending");

    const batchIds = [...new Set((transactions || []).map((transaction) => transaction.batch_id))];
    const { data: updatedBatches } = await supabase
      .from("milk_batches")
      .select(batchSelectColumns)
      .in("batch_id", batchIds);

    return res.status(201).json({
      transactions: transactions || [],
      batches: updatedBatches || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
