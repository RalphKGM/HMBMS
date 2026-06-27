import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

function Login() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

    fetch(`${apiBase}/api/setup/status`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));

        if (!response.ok || body.ready === false) {
          throw new Error(body.message || "Backend setup is incomplete.");
        }

        return body;
      })
      .then(() => {
        if (isMounted) setSetupMessage("");
      })
      .catch((setupError) => {
        if (isMounted) setSetupMessage(setupError.message || "Backend setup is incomplete.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = (event) => {
    event.preventDefault();
    (async () => {
      setIsLoggingIn(true);
      setError("");

      try {
        await login(username, password);
      } catch (err) {
        setError(err.message || "Login failed.");
      } finally {
        setIsLoggingIn(false);
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
        <button type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? "Logging in..." : "Login"}
        </button>
      </form>
      {setupMessage && <p className="message">{setupMessage}</p>}
      {error && <p className="message">{error}</p>}
    </main>
  );
}

export default Login;
