import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export const listUsers = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("user_id, username, role, first_name, last_name, is_active, created_at")
      .order("user_id", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ users: data || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createUser = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: "Supabase not configured on server." });
  }

  const { username, password, role, first_name, last_name, is_active } = req.body || {};

  if (!username || !password || !role || !first_name || !last_name) {
    return res.status(400).json({
      error: "username, password, role, first_name, and last_name are required.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .insert({
        username,
        password,
        role,
        first_name,
        last_name,
        is_active: is_active ?? true,
      })
      .select("user_id, username, role, first_name, last_name, is_active, created_at")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ user: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};