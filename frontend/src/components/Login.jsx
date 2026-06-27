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
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-8 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden gap-6 lg:flex">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-[#1d5bc4] shadow-sm">
              Human Milk Bank Management System
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-[#003b90]">
              Secure access for milk bank operations.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Sign in to manage donors, beneficiaries, milk records, pasteurization, dispensing,
              reports, and staff accounts.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {["Donor Records", "Batch Tracking", "Role Access"].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-[#003b90]">{item}</p>
                <p className="mt-2 text-xs text-slate-500">Protected staff workflow</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">HMBMS</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#003b90]">Welcome Back</h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your staff credentials to continue.
            </p>
          </div>

          {(setupMessage || error) && (
            <div className="mb-5 grid gap-3">
              {setupMessage && <p className="message">{setupMessage}</p>}
              {error && <p className="message border-rose-200 bg-rose-50 text-rose-700">{error}</p>}
            </div>
          )}

          <form className="grid-cols-1" onSubmit={handleLogin}>
            <label>
              Username
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                required
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
              />
            </label>
            <button
              className="mt-2 border-[#1d5bc4] bg-[#1d5bc4] py-3 text-white hover:border-[#003b90] hover:bg-[#003b90]"
              type="submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Logging in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Account Access
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Inactive accounts cannot sign in. Please contact an administrator if your access
              needs to be restored.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
