import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { verifyPassword } from "../lib/passwords.js";

export const login = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res
      .status(500)
      .json({ error: "Supabase not configured on server." });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "username and password are required." });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("user_id, username, password, role, first_name, last_name, is_active")
      .eq("username", username)
      .single();

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("schema cache")) {
        return res.status(503).json({
          error:
            "Supabase tables are missing. Run frontend/supabase/schema.sql in the Supabase SQL editor.",
        });
      }
      return res.status(500).json({ error: error.message });
    }

    if (!data || !(await verifyPassword(password, data.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!data.is_active) {
      return res.status(403).json({ error: "This account is inactive." });
    }

    const { password: _p, ...user } = data;
    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
