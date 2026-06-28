import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const inquirySelectColumns =
  "inquiry_id, beneficiary_id, requested_volume_ml, inquiry_date, status, logged_by, created_at";

const beneficiarySelectColumns = "beneficiary_id, first_name, last_name, contact_number";

const userSelectColumns = "user_id, first_name, last_name, username";

export const listInquiries = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const [
      { data: inquiries, error: inquiriesError },
      { data: beneficiaries, error: beneficiariesError },
      { data: users, error: usersError },
    ] = await Promise.all([
      supabase
        .from("milk_inquiries")
        .select(inquirySelectColumns)
        .order("inquiry_date", { ascending: true })
        .order("inquiry_id", { ascending: true }),
      supabase
        .from("beneficiaries")
        .select(beneficiarySelectColumns)
        .order("beneficiary_id", { ascending: true }),
      supabase
        .from("users")
        .select(userSelectColumns)
        .order("user_id", { ascending: true }),
    ]);

    if (inquiriesError) return res.status(500).json({ error: inquiriesError.message });
    if (beneficiariesError) return res.status(500).json({ error: beneficiariesError.message });
    if (usersError) return res.status(500).json({ error: usersError.message });

    return res.json({
      inquiries: inquiries || [],
      beneficiaries: beneficiaries || [],
      users: users || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
