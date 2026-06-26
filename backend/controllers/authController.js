const { supabase, isSupabaseConfigured } = require('../lib/supabase');

exports.login = async (req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(500).json({ error: 'Supabase not configured on server.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, role, username, password')
      .eq('username', username)
      .limit(1)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password: _p, ...user } = data;
    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
