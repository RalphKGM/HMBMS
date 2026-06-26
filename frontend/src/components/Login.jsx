import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = (event) => {
    event.preventDefault();
    (async () => {
      try {
        await login(username, password);
        setError("");
      } catch (err) {
        setError(err.message || "Login failed.");
      }
    })();
  };

  return (
    <main>
      <h1>HMBMS Login</h1>
      <form onSubmit={handleLogin}>
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
    </main>
  );
}

export default Login;
