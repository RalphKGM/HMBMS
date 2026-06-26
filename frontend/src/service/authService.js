export async function authenticate(username, password, demoUsers = [], fallbackUsers = []) {
  const apiBase = import.meta.env.VITE_API_URL || '';
  const url = `${apiBase}/api/auth/login`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid credentials');
    }
    const body = await res.json();
    if (body && body.user) return body.user;
    throw new Error('Invalid response from server');
  } catch (err) {
    console.warn('Backend login failed, falling back to local users:', err.message);
    const sourceUsers = demoUsers && demoUsers.length ? demoUsers : fallbackUsers;
    const user = sourceUsers.find(
      (item) => item.username === username && item.password === password,
    );
    return user || null;
  }
}

export default { authenticate };