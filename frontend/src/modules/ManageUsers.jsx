import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";

async function fetchUsers(apiBase) {
  const response = await fetch(`${apiBase}/api/users`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load users.");
  }

  return body.users || [];
}

function formatUserDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "Admin",
    first_name: "",
    last_name: "",
  });

  const userStats = useMemo(() => {
    const activeUsers = users.filter((user) => user.is_active).length;
    const adminUsers = users.filter((user) => user.role === "Admin").length;
    const roles = new Set(users.map((user) => user.role).filter(Boolean)).size;

    return [
      { label: "Total Users", value: users.length, note: "Registered accounts" },
      { label: "Active Users", value: activeUsers, note: "Can access the system" },
      { label: "Administrators", value: adminUsers, note: "Full access accounts" },
      { label: "Roles Used", value: roles, note: "Configured staff roles" },
    ];
  }, [users]);

  const userRows = useMemo(() => {
    return users.map((user) => {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
      const isActive = Boolean(user.is_active);

      return [
        <span key={`id-${user.user_id}`} className="font-semibold text-slate-800">
          #{user.user_id}
        </span>,
        <span key={`username-${user.user_id}`} className="font-semibold text-slate-900">
          {user.username}
        </span>,
        fullName || "-",
        <span
          key={`role-${user.user_id}`}
          className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
        >
          {user.role}
        </span>,
        <span
          key={`status-${user.user_id}`}
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
            isActive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>,
        formatUserDate(user.created_at),
      ];
    });
  }, [users]);

  const loadUsers = async() => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

    try {
      setUsers(await fetchUsers(apiBase));
      setError("");
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  const openAddUserModal = () => {
    setFormError("");
    setShowForm(true);
  };

  const closeAddUserModal = () => {
    if (saving) return;
    setFormError("");
    setShowForm(false);
  };

  useEffect(() => {
    let isMounted = true;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

    fetchUsers(apiBase)
      .then((records) => {
        if (isMounted) setUsers(records);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load users.");
        setUsers([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormSuccess("");

    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

    try {
      const response = await fetch(`${apiBase}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to create user.");
      }

      setFormData({
        username: "",
        password: "",
        role: "Admin",
        first_name: "",
        last_name: "",
      });
      setShowForm(false);
      setFormSuccess("User created successfully.");
      await loadUsers();
    } catch (createError) {
      setFormError(createError.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading users...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <p className="message">{error}</p>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Manage Users</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Create staff accounts and review access for administrators, doctors, nurses, and midwives.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {userStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[#003b90]">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-500">{stat.note}</p>
          </article>
        ))}
      </div>

      {formSuccess && <p className="message">{formSuccess}</p>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>New Staff Account</h3>
                <p className="mt-1 text-sm">
                  Fill in the staff details below. The selected role controls what modules the user can access.
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closeAddUserModal}
                aria-label="Close add user modal"
              >
                X
              </button>
            </div>

            {formError && <p className="message mb-4">{formError}</p>}

            <form className="user-form" onSubmit={handleCreateUser}>
              <label>
                Username
                <input
                  value={formData.username}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, username: event.target.value }))
                  }
                  placeholder="e.g. nurse_maria"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="password"
                  required
                />
              </label>
              <label>
                Role
                <select
                  value={formData.role}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, role: event.target.value }))
                  }
                  required
                >
                  <option value="Admin">Admin</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Midwife">Midwife</option>
                </select>
              </label>
              <label>
                First Name
                <input
                  value={formData.first_name}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, first_name: event.target.value }))
                  }
                  placeholder="Given name"
                  required
                />
              </label>
              <label>
                Last Name
                <input
                  value={formData.last_name}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, last_name: event.target.value }))
                  }
                  placeholder="Family name"
                  required
                />
              </label>
              <div className="flex flex-wrap justify-end gap-3 sm:col-span-2 xl:col-span-3">
                <button type="button" onClick={closeAddUserModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Register User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>User Directory</h3>
            <p className="mt-1 text-sm">Review existing staff accounts and current account status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {users.length} {users.length === 1 ? "record" : "records"}
            </span>
            <button
              type="button"
              className="border-blue-600 bg-blue-600 px-4 text-white hover:border-blue-700 hover:bg-blue-700"
              onClick={openAddUserModal}
            >
              Add User
            </button>
          </div>
        </div>
        <Table
          headers={["ID", "Username", "Name", "Role", "Status", "Created"]}
          rows={userRows}
        />
      </div>
    </section>
  );
}

export default ManageUsers;
