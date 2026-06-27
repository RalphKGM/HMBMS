import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const batchSelectColumns =
  "batch_id, batch_number, is_pooled, total_volume, available_volume, status, expiration_date, created_at";

const collectionSelectColumns =
  "collection_id, batch_id, donor_id, collection_type, collection_date, volume_ml, collected_by, status, created_at";

const pasteurizationSelectColumns =
  "pasteurization_id, batch_id, pre_test_result, pre_test_date, post_test_result, post_test_date, expiration_date, recorded_by";

function generateBatchNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = String(Date.now()).slice(-5);
  return `BATCH-${date}-${suffix}`;
}

export const listMilkRecords = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const [{ data: batches, error: batchesError }, { data: collections, error: collectionsError }] =
      await Promise.all([
        supabase
          .from("milk_batches")
          .select(batchSelectColumns)
          .order("batch_id", { ascending: false }),
        supabase
          .from("milk_collections")
          .select(collectionSelectColumns)
          .order("collection_date", { ascending: false }),
      ]);

    if (batchesError) {
      return res.status(500).json({ error: batchesError.message });
    }

    if (collectionsError) {
      return res.status(500).json({ error: collectionsError.message });
    }

    return res.json({
      batches: batches || [],
      collections: collections || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createMilkCollection = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const {
    donorId,
    collectionType,
    collectionDate,
    volumeMl,
    collectedBy,
  } = req.body || {};
  const volume = Number(volumeMl);
  const parsedDonorId = Number(donorId);

  if (!Number.isInteger(parsedDonorId) || !collectionType || !collectionDate || !volume || volume <= 0) {
    return res.status(400).json({
      error: "donorId, collectionType, collectionDate, and positive volumeMl are required.",
    });
  }

  if (volume < 30 || volume > 240) {
    return res.status(400).json({
      error: "Each donation session must be between 30 mL and 240 mL.",
    });
  }

  try {
    const { data: existingCollections, error: existingCollectionsError } = await supabase
      .from("milk_collections")
      .select("collection_id, volume_ml")
      .eq("donor_id", parsedDonorId)
      .eq("collection_date", collectionDate);

    if (existingCollectionsError) {
      return res.status(500).json({ error: existingCollectionsError.message });
    }

    const existingDailyVolume = (existingCollections || []).reduce(
      (total, item) => total + Number(item.volume_ml || 0),
      0,
    );

    if (existingDailyVolume + volume > 800) {
      return res.status(400).json({
        error: "A donor cannot donate more than 800 mL in a single day.",
      });
    }

    const { data: batch, error: batchError } = await supabase
      .from("milk_batches")
      .insert({
        batch_number: generateBatchNumber(),
        is_pooled: false,
        total_volume: volume,
        available_volume: 0,
        status: "Pending Lab",
      })
      .select(batchSelectColumns)
      .single();

    if (batchError) {
      return res.status(500).json({ error: batchError.message });
    }

    const { data: collection, error: collectionError } = await supabase
      .from("milk_collections")
      .insert({
        batch_id: batch.batch_id,
        donor_id: parsedDonorId,
        collection_type: collectionType,
        collection_date: collectionDate,
        volume_ml: volume,
        collected_by: collectedBy || null,
        status: "Pending Lab",
      })
      .select(collectionSelectColumns)
      .single();

    if (collectionError) {
      await supabase.from("milk_batches").delete().eq("batch_id", batch.batch_id);
      return res.status(500).json({ error: collectionError.message });
    }

    const { data: pasteurizationRecord, error: pasteurizationError } = await supabase
      .from("pasteurization_records")
      .insert({
        batch_id: batch.batch_id,
        recorded_by: collectedBy || null,
      })
      .select(pasteurizationSelectColumns)
      .single();

    if (pasteurizationError) {
      await supabase.from("milk_collections").delete().eq("collection_id", collection.collection_id);
      await supabase.from("milk_batches").delete().eq("batch_id", batch.batch_id);
      return res.status(500).json({ error: pasteurizationError.message });
    }

    return res.status(201).json({ batch, collection, pasteurizationRecord });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
