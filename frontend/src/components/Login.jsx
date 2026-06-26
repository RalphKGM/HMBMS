import { useState } from "react";
import { authenticate } from "../service/authService";

function Login({ setCurrentUser }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const login = (event) => {
    event.preventDefault();
    (async () => {
      try {
        const user = await authenticate(username, password);
        if (!user) {
          setError("Invalid username or password.");
          return;
        }
        setCurrentUser(user);
      } catch (err) {
        setError(err.message || "Login failed.");
      }
    })();
  }

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
    </main>
  );
}

export default Login;
