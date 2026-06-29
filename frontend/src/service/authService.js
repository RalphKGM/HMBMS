export async function authenticate(username, password) {
 const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "");
const url = `${apiBase}/api/auth/login`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Invalid credentials");
  }

  const body = await res.json();

  if (body && body.user) {
    const user = body.user;
    return {
      ...user,
      id: user.id ?? user.user_id,
      name:
        user.name ??
        [user.first_name, user.last_name].filter(Boolean).join(" ") ??
        user.username,
    };
  }

  throw new Error("Invalid response from server");
}

export default { authenticate };
