import { useState } from "react";
import Table from "./Table";

function Login({ data, setCurrentUser }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  function login(event) {
    event.preventDefault();
    const user = data.users.find(
      (item) => item.username === username && item.password === password,
    );
    if (!user) {
      setError("Invalid username or password.");
      return;
    }
    setCurrentUser(user);
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
      <h2>Demo Accounts</h2>
      <Table
        headers={["Role", "Username", "Password"]}
        rows={data.users.map((user) => [
          user.role,
          user.username,
          user.password,
        ])}
      />
    </main>
  );
}

export default Login;
