import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const requiredTables = [
  "users",
  "donors",
  "beneficiaries",
  "milk_batches",
  "milk_collections",
  "pasteurization_records",
  "disposal_records",
  "milk_inquiries",
  "dispensing_transactions",
  "sms_logs",
  "email_logs",
];

const requiredColumnChecks = [
  {
    table: "milk_inquiries",
    columns: "inquiry_id, beneficiary_id, requested_volume_ml, inquiry_date, status, logged_by, created_at",
  },
  {
    table: "beneficiaries",
    columns: "beneficiary_id, first_name, last_name, contact_number, email, address, is_active, created_by, created_at, updated_at",
  },
];

function isMissingTableError(error) {
  return error?.code === "PGRST205" || error?.message?.includes("schema cache");
}

export const getSetupStatus = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(200).json({
      configured: false,
      ready: false,
      missingTables: requiredTables,
      message: "Supabase is not configured. Add Supabase keys to .env.",
    });
  }

  const missingTables = [];
  const errors = [];

  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select("*").limit(1);

    if (error) {
      if (isMissingTableError(error)) {
        missingTables.push(table);
      } else {
        errors.push({ table, message: error.message });
      }
    }
  }

  for (const check of requiredColumnChecks) {
    const { error } = await supabase.from(check.table).select(check.columns).limit(1);

    if (error) {
      errors.push({ table: check.table, message: error.message });
    }
  }

  const ready = missingTables.length === 0 && errors.length === 0;

  return res.status(ready ? 200 : 503).json({
    configured: true,
    ready,
    missingTables,
    errors,
    message: ready
      ? "Supabase is ready."
      : "Supabase setup is incomplete. Run frontend/supabase/schema.sql in the Supabase SQL editor.",
  });
};
