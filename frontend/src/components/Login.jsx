import { useState, useEffect } from "react";
import Table from "./Table";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { authenticate } from "../service/authService";

function Login({ data, setCurrentUser }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [demoUsers, setDemoUsers] = useState(data?.users || []);
  const [loadingDemoUsers, setLoadingDemoUsers] = useState(false);

  function login(event) {
    event.preventDefault();
    (async () => {
      try {
        const user = await authenticate(username, password, demoUsers, data.users);
        if (!user) {
          setError('Invalid username or password.');
          return;
        }
        setCurrentUser(user);
      } catch (err) {
        setError('Login failed.');
      }
    })();
  }

  useEffect(() => {
    let mounted = true;
    async function loadDemoUsers() {
      if (!isSupabaseConfigured || !supabase) return;
      setLoadingDemoUsers(true);
      const { data: rows, error } = await supabase
        .from("users")
        .select("role,username,password");
      setLoadingDemoUsers(false);
      if (error) {
        console.error("Error fetching demo users:", error);
        return;
      }
      if (mounted && rows) setDemoUsers(rows);
    }
    loadDemoUsers();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main>
      <h1>HMBMS Login</h1>
      <form onSubmit={login}>
        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="submit">Login</button>
      </form>
      {error && <p className="message">{error}</p>}
      <h2>Demo Accounts</h2>
      <Table
        headers={["Role", "Username", "Password"]}
        rows={(demoUsers && demoUsers.length ? demoUsers : data.users).map(
          (user) => [user.role, user.username, user.password],
        )}
      />
    </main>
  );
}

export default Login;
