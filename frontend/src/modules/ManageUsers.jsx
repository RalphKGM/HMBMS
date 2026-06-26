import { useEffect, useState } from "react";

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

  const loadUsers = async() => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

    try {
      const response = await fetch(`${apiBase}/api/users`);
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to load users.");
      }

      setUsers(body.users || []);
      setError("");
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
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
    return <p>Loading users...</p>;
  }

  if (error) {
    return <p className="message">{error}</p>;
  }

  return (
    <section>
      <div className="section-header">
        <h2>Manage Users</h2>
        <button type="button" onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Cancel" : "Add New User"}
        </button>
      </div>

      {formSuccess && <p className="message">{formSuccess}</p>}
      {formError && <p className="message">{formError}</p>}

      {showForm && (
        <form className="user-form" onSubmit={handleCreateUser}>
          <label>
            Username
            <input
              value={formData.username}
              onChange={(event) =>
                setFormData((current) => ({ ...current, username: event.target.value }))
              }
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
              required
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Register User"}
          </button>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const fullName = [user.first_name, user.last_name]
              .filter(Boolean)
              .join(" ");

            return (
              <tr key={user.user_id}>
                <td>{user.user_id}</td>
                <td>{user.username}</td>
                <td>{fullName || "-"}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? "Active" : "Inactive"}</td>
                <td>{user.created_at ? new Date(user.created_at).toLocaleString() : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default ManageUsers;
