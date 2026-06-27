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

function normalizeContributors(contributors) {
  if (!Array.isArray(contributors)) return [];

  return contributors
    .map((contributor) => ({
      donorId: Number(contributor?.donorId),
      volumeMl: Number(contributor?.volumeMl),
    }))
    .filter((contributor) => Number.isInteger(contributor.donorId) && Number.isFinite(contributor.volumeMl));
}

async function assertDailyLimitForContributors(contributors, collectionDate) {
  const donorIds = [...new Set(contributors.map((contributor) => contributor.donorId))];

  if (!donorIds.length) {
    throw new Error("At least one donor contribution is required.");
  }

  const { data: existingCollections, error } = await supabase
    .from("milk_collections")
    .select("donor_id, volume_ml")
    .eq("collection_date", collectionDate)
    .in("donor_id", donorIds);

  if (error) {
    throw new Error(error.message);
  }

  const existingTotals = (existingCollections || []).reduce((totals, collection) => {
    const donorId = Number(collection.donor_id);
    totals[donorId] = (totals[donorId] || 0) + Number(collection.volume_ml || 0);
    return totals;
  }, {});

  const runningTotals = { ...existingTotals };

  for (const contributor of contributors) {
    const nextTotal = Number(runningTotals[contributor.donorId] || 0) + contributor.volumeMl;
    if (nextTotal > 800) {
      throw new Error("A donor cannot donate more than 800 mL in a single day.");
    }
    runningTotals[contributor.donorId] = nextTotal;
  }
}

function validateContributorVolume(volume) {
  if (!Number.isFinite(volume) || volume <= 0) {
    return "Each donor contribution must be a positive number.";
  }

  if (volume < 30 || volume > 240) {
    return "Each donor contribution must be between 30 mL and 240 mL.";
  }

  return "";
}

async function createPasteurizationForBatch(batchId, recordedBy) {
  const { data, error } = await supabase
    .from("pasteurization_records")
    .insert({
      batch_id: batchId,
      recorded_by: recordedBy || null,
    })
    .select(pasteurizationSelectColumns)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
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
    poolBatch,
    contributors,
  } = req.body || {};
  const volume = Number(volumeMl);
  const parsedDonorId = Number(donorId);
  const isPooled = Boolean(poolBatch);
  const normalizedContributors = isPooled
    ? normalizeContributors(contributors)
    : [{ donorId: parsedDonorId, volumeMl: volume }];

  if (!collectionType || !collectionDate) {
    return res.status(400).json({
      error: "collectionType and collectionDate are required.",
    });
  }

  if (isPooled) {
    if (!normalizedContributors.length) {
      return res.status(400).json({
        error: "At least one donor contribution is required.",
      });
    }

    const donorSet = new Set();
    for (const contributor of normalizedContributors) {
      if (!Number.isInteger(contributor.donorId)) {
        return res.status(400).json({ error: "Each contributor must have a valid donor." });
      }

      const volumeError = validateContributorVolume(contributor.volumeMl);
      if (volumeError) {
        return res.status(400).json({ error: volumeError });
      }

      if (donorSet.has(contributor.donorId)) {
        return res.status(400).json({
          error: "Duplicate donor selection is not allowed within the same pooled batch.",
        });
      }

      donorSet.add(contributor.donorId);
    }
  } else if (!Number.isInteger(parsedDonorId) || !volume) {
    return res.status(400).json({
      error: "donorId and positive volumeMl are required.",
    });
  }

  if (!isPooled) {
    const volumeError = validateContributorVolume(volume);
    if (volumeError) {
      return res.status(400).json({ error: volumeError });
    }
  }

  try {
    await assertDailyLimitForContributors(normalizedContributors, collectionDate);

    const totalVolume = normalizedContributors.reduce(
      (total, contributor) => total + Number(contributor.volumeMl || 0),
      0,
    );

    const { data: batch, error: batchError } = await supabase
      .from("milk_batches")
      .insert({
        batch_number: generateBatchNumber(),
        is_pooled: isPooled,
        total_volume: totalVolume,
        available_volume: totalVolume,
        status: "Pending Lab",
      })
      .select(batchSelectColumns)
      .single();

    if (batchError) {
      return res.status(500).json({ error: batchError.message });
    }

    const collectionRows = normalizedContributors.map((contributor) => ({
      batch_id: batch.batch_id,
      donor_id: contributor.donorId,
      collection_type: collectionType,
      collection_date: collectionDate,
      volume_ml: contributor.volumeMl,
      collected_by: collectedBy || null,
      status: "Pending Lab",
    }));

    const { data: collections, error: collectionError } = await supabase
      .from("milk_collections")
      .insert(collectionRows)
      .select(collectionSelectColumns)
      .order("collection_id", { ascending: true });

    if (collectionError) {
      await supabase.from("milk_batches").delete().eq("batch_id", batch.batch_id);
      return res.status(500).json({ error: collectionError.message });
    }

    const pasteurizationRecord = await createPasteurizationForBatch(batch.batch_id, collectedBy);

    return res.status(201).json({
      batch,
      collections: collections || [],
      collection: collections?.[0] || null,
      pasteurizationRecord,
    });
  } catch (err) {
    if (err.message === "A donor cannot donate more than 800 mL in a single day.") {
      return res.status(400).json({ error: err.message });
    }

    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
