import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { SIMULATED_AVAILABLE_MESSAGE, logPendingInquirySms } from "./smsController.js";

const batchSelectColumns =
  "batch_id, batch_number, total_volume, available_volume, status, expiration_date, created_at";

const recordSelectColumns =
  "pasteurization_id, batch_id, pre_test_result, pre_test_date, post_test_result, post_test_date, expiration_date, recorded_by";

const disposalSelectColumns =
  "disposal_id, batch_id, disposal_date, reason, disposed_by, created_at";

function nextBatchStatus(preTestResult, postTestResult) {
  if (preTestResult === "Failed" || postTestResult === "Failed") return "Disposed";
  if (postTestResult === "Passed") return "Available";
  if (preTestResult === "Passed") return "Pending Post-Test";
  return "Pending Lab";
}

function disposalReason(preTestResult, postTestResult) {
  if (preTestResult === "Failed") return "Failed pre-test";
  if (postTestResult === "Failed") return "Failed post-test";
  return null;
}

function latestRecordPerBatch(records = []) {
  const latestRecords = new Map();

  for (const record of records) {
    if (!latestRecords.has(record.batch_id)) {
      latestRecords.set(record.batch_id, record);
    }
  }

  return Array.from(latestRecords.values());
}

async function saveRecordForBatch(batchId, values) {
  const { data: existingRecords, error: existingError } = await supabase
    .from("pasteurization_records")
    .select("pasteurization_id")
    .eq("batch_id", batchId)
    .order("pasteurization_id", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingRecordId = existingRecords?.[0]?.pasteurization_id;

  if (existingRecordId) {
    const { data, error } = await supabase
      .from("pasteurization_records")
      .update(values)
      .eq("pasteurization_id", existingRecordId)
      .select(recordSelectColumns)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  const { data, error } = await supabase
    .from("pasteurization_records")
    .insert({
      batch_id: batchId,
      ...values,
    })
    .select(recordSelectColumns)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export const listPasteurizationData = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const [
      { data: batches, error: batchesError },
      { data: records, error: recordsError },
      { data: disposals, error: disposalsError },
    ] = await Promise.all([
      supabase
        .from("milk_batches")
        .select(batchSelectColumns)
        .order("batch_id", { ascending: false }),
      supabase
        .from("pasteurization_records")
        .select(recordSelectColumns)
        .order("pasteurization_id", { ascending: false }),
      supabase
        .from("disposal_records")
        .select(disposalSelectColumns)
        .order("disposal_date", { ascending: false }),
    ]);

    if (batchesError) return res.status(500).json({ error: batchesError.message });
    if (recordsError) return res.status(500).json({ error: recordsError.message });
    if (disposalsError) return res.status(500).json({ error: disposalsError.message });

    return res.json({
      batches: batches || [],
      records: latestRecordPerBatch(records),
      disposals: disposals || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const savePasteurizationRecord = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const {
    batchId,
    preTestResult,
    preTestDate,
    postTestResult,
    postTestDate,
    expirationDate,
    recordedBy,
  } = req.body || {};
  const parsedBatchId = Number(batchId);

  if (!Number.isInteger(parsedBatchId) || parsedBatchId <= 0 || !preTestResult || !preTestDate) {
    return res.status(400).json({
      error: "batchId, preTestResult, and preTestDate are required.",
    });
  }

  if (!["Passed", "Failed"].includes(preTestResult)) {
    return res.status(400).json({ error: "preTestResult must be Passed or Failed." });
  }

  if (postTestResult && !["Passed", "Failed"].includes(postTestResult)) {
    return res.status(400).json({ error: "postTestResult must be Passed or Failed." });
  }

  if (preTestResult === "Failed" && postTestResult === "Passed") {
    return res.status(400).json({ error: "postTestResult cannot pass when preTestResult failed." });
  }

  const normalizedPostTestResult = preTestResult === "Failed" ? "Failed" : postTestResult;
  const normalizedPostTestDate = normalizedPostTestResult ? postTestDate || preTestDate : null;
  const normalizedExpirationDate = normalizedPostTestResult === "Passed" ? expirationDate : null;

  if (normalizedPostTestResult === "Passed" && !normalizedExpirationDate) {
    return res.status(400).json({ error: "expirationDate is required when post-test passes." });
  }

  try {
    const status = nextBatchStatus(preTestResult, normalizedPostTestResult);
    const { data: batch, error: batchLookupError } = await supabase
      .from("milk_batches")
      .select(batchSelectColumns)
      .eq("batch_id", parsedBatchId)
      .single();

    if (batchLookupError) {
      return res.status(500).json({ error: batchLookupError.message });
    }

    const record = await saveRecordForBatch(parsedBatchId, {
      pre_test_result: preTestResult,
      pre_test_date: preTestDate,
      post_test_result: normalizedPostTestResult || null,
      post_test_date: normalizedPostTestDate,
      expiration_date: normalizedExpirationDate,
      recorded_by: recordedBy || null,
    });

    const { data: updatedBatch, error: batchUpdateError } = await supabase
      .from("milk_batches")
      .update({
        status,
        available_volume: status === "Available" ? batch.total_volume : batch.available_volume,
        expiration_date: normalizedExpirationDate || batch.expiration_date,
      })
      .eq("batch_id", parsedBatchId)
      .select(batchSelectColumns)
      .single();

    if (batchUpdateError) {
      return res.status(500).json({ error: batchUpdateError.message });
    }

    const { error: collectionStatusError } = await supabase
      .from("milk_collections")
      .update({ status })
      .eq("batch_id", parsedBatchId);

    if (collectionStatusError) {
      return res.status(500).json({ error: collectionStatusError.message });
    }

    let disposal = null;
    const reason = disposalReason(preTestResult, normalizedPostTestResult);
    if (reason) {
      const { data: disposalData, error: disposalError } = await supabase
        .from("disposal_records")
        .insert({
          batch_id: parsedBatchId,
          disposal_date: normalizedPostTestResult === "Failed" ? normalizedPostTestDate : preTestDate,
          reason,
          disposed_by: recordedBy || null,
        })
        .select(disposalSelectColumns)
        .single();

      if (disposalError) {
        return res.status(500).json({ error: disposalError.message });
      }

      const { data: disposedBatch, error: disposeBatchError } = await supabase
        .from("milk_batches")
        .update({
          status: "Disposed",
          available_volume: 0,
        })
        .eq("batch_id", parsedBatchId)
        .select(batchSelectColumns)
        .single();

      if (disposeBatchError) {
        return res.status(500).json({ error: disposeBatchError.message });
      }

      disposal = disposalData;
      return res.status(201).json({ record, batch: disposedBatch, disposal });
    }

    if (updatedBatch?.status === "Available" && batch.status !== "Available") {
      try {
        await logPendingInquirySms({
          message: SIMULATED_AVAILABLE_MESSAGE,
          sentBy: recordedBy || null,
        });
      } catch (smsError) {
        console.error("Failed to log simulated SMS notifications:", smsError);
      }
    }

    return res.status(201).json({ record, batch: updatedBatch, disposal });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const disposeBatch = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const batchId = Number(req.params.batchId);
  const { reason, disposedBy } = req.body || {};

  if (!Number.isInteger(batchId)) {
    return res.status(400).json({ error: "Invalid batch id." });
  }

  if (!reason) {
    return res.status(400).json({ error: "Disposal reason is required." });
  }

  try {
    const { data: disposal, error: disposalError } = await supabase
      .from("disposal_records")
      .insert({
        batch_id: batchId,
        disposal_date: new Date().toISOString().slice(0, 10),
        reason,
        disposed_by: disposedBy || null,
      })
      .select(disposalSelectColumns)
      .single();

    if (disposalError) {
      return res.status(500).json({ error: disposalError.message });
    }

    const { data: batch, error: batchError } = await supabase
      .from("milk_batches")
      .update({
        status: "Disposed",
        available_volume: 0,
      })
      .eq("batch_id", batchId)
      .select(batchSelectColumns)
      .single();

    if (batchError) {
      return res.status(500).json({ error: batchError.message });
    }

    return res.status(201).json({ disposal, batch });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
