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
    .filter(
      (contributor) =>
        Number.isInteger(contributor.donorId) &&
        contributor.donorId > 0 &&
        Number.isFinite(contributor.volumeMl),
    );
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

async function assertActiveDonorsForContributors(contributors) {
  const donorIds = [...new Set(contributors.map((contributor) => contributor.donorId))];

  if (!donorIds.length) {
    throw new Error("At least one donor contribution is required.");
  }

  const { data: donors, error } = await supabase
    .from("donors")
    .select("donor_id, status")
    .in("donor_id", donorIds);

  if (error) {
    throw new Error(error.message);
  }

  const donorsById = (donors || []).reduce((lookup, donor) => {
    lookup[Number(donor.donor_id)] = donor;
    return lookup;
  }, {});

  const missingDonor = donorIds.find((donorId) => !donorsById[donorId]);
  if (missingDonor) {
    throw new Error("Selected donor record was not found.");
  }

  const inactiveDonor = donorIds.find((donorId) => donorsById[donorId]?.status !== "Active");
  if (inactiveDonor) {
    throw new Error("Inactive donors cannot be used for new milk collections.");
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

    for (const contributor of normalizedContributors) {
      if (!Number.isInteger(contributor.donorId) || contributor.donorId <= 0) {
        return res.status(400).json({ error: "Each contributor must have a valid donor." });
      }

      const volumeError = validateContributorVolume(contributor.volumeMl);
      if (volumeError) {
        return res.status(400).json({ error: volumeError });
      }
    }
  } else if (!Number.isInteger(parsedDonorId) || parsedDonorId <= 0 || !volume) {
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
    await assertActiveDonorsForContributors(normalizedContributors);
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
    if (
      [
        "A donor cannot donate more than 800 mL in a single day.",
        "Inactive donors cannot be used for new milk collections.",
        "Selected donor record was not found.",
      ].includes(err.message)
    ) {
      return res.status(400).json({ error: err.message });
    }

    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

export const createPooledBatch = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const { collectionType, collectionDate, collectedBy } = req.body || {};

  if (!collectionType || !collectionDate) {
    return res.status(400).json({
      error: "collectionType and collectionDate are required.",
    });
  }

  try {
    const { data: batch, error: batchError } = await supabase
      .from("milk_batches")
      .insert({
        batch_number: generateBatchNumber(),
        is_pooled: true,
        total_volume: 0,
        available_volume: 0,
        status: "Pending Lab",
      })
      .select(batchSelectColumns)
      .single();

    if (batchError) {
      return res.status(500).json({ error: batchError.message });
    }

    return res.status(201).json({ batch, collectionType, collectionDate, collectedBy: collectedBy || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const addContributorToPooledBatch = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const batchId = Number(req.params.batchId);
  const { donorId, volumeMl, collectionType, collectionDate, collectedBy } = req.body || {};
  const parsedDonorId = Number(donorId);
  const parsedVolume = Number(volumeMl);

  if (!Number.isInteger(batchId)) {
    return res.status(400).json({ error: "Invalid batch id." });
  }

  if (!Number.isInteger(parsedDonorId) || !collectionType || !collectionDate || !parsedVolume) {
    return res.status(400).json({
      error: "donorId, collectionType, collectionDate, and positive volumeMl are required.",
    });
  }

  const volumeError = validateContributorVolume(parsedVolume);
  if (volumeError) {
    return res.status(400).json({ error: volumeError });
  }

  try {
    const { data: batch, error: batchLookupError } = await supabase
      .from("milk_batches")
      .select(batchSelectColumns)
      .eq("batch_id", batchId)
      .single();

    if (batchLookupError) {
      return res.status(500).json({ error: batchLookupError.message });
    }

    if (!batch || !batch.is_pooled) {
      return res.status(400).json({ error: "Selected batch is not a pooled batch." });
    }

    const { data: batchCollections, error: batchCollectionsError } = await supabase
      .from("milk_collections")
      .select("collection_id, donor_id, volume_ml")
      .eq("batch_id", batchId);

    if (batchCollectionsError) {
      return res.status(500).json({ error: batchCollectionsError.message });
    }

    if (batchCollections && batchCollections.length > 0) {
      const batchCollectionDate = batchCollections[0].collection_date;
      if (batchCollectionDate && batchCollectionDate !== collectionDate) {
        return res.status(400).json({
          error: "A pooled batch can only accept contributions with the same collection date.",
        });
      }
    }

    await assertActiveDonorsForContributors([{ donorId: parsedDonorId, volumeMl: parsedVolume }]);
    await assertDailyLimitForContributors([{ donorId: parsedDonorId, volumeMl: parsedVolume }], collectionDate);

    const { data: collection, error: collectionError } = await supabase
      .from("milk_collections")
      .insert({
        batch_id: batchId,
        donor_id: parsedDonorId,
        collection_type: collectionType,
        collection_date: collectionDate,
        volume_ml: parsedVolume,
        collected_by: collectedBy || null,
        status: "Pending Lab",
      })
      .select(collectionSelectColumns)
      .single();

    if (collectionError) {
      return res.status(500).json({ error: collectionError.message });
    }

    const updatedTotal = Number(batch.total_volume || 0) + parsedVolume;
    const { data: updatedBatch, error: batchUpdateError } = await supabase
      .from("milk_batches")
      .update({
        total_volume: updatedTotal,
        available_volume: updatedTotal,
      })
      .eq("batch_id", batchId)
      .select(batchSelectColumns)
      .single();

    if (batchUpdateError) {
      await supabase.from("milk_collections").delete().eq("collection_id", collection.collection_id);
      return res.status(500).json({ error: batchUpdateError.message });
    }

    return res.status(201).json({ batch: updatedBatch, collection });
  } catch (err) {
    if (
      [
        "A donor cannot donate more than 800 mL in a single day.",
        "Inactive donors cannot be used for new milk collections.",
        "Selected donor record was not found.",
      ].includes(err.message)
    ) {
      return res.status(400).json({ error: err.message });
    }

    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
