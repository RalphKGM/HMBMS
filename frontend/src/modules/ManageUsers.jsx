import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";

const initialUserForm = {
  username: "",
  password: "",
  role: "Admin",
  first_name: "",
  last_name: "",
};

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
  const [editingUser, setEditingUser] = useState(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formData, setFormData] = useState(initialUserForm);

  function resetUserForm() {
    setFormData(initialUserForm);
  }

  function openEditUser(user) {
    setFormError("");
    setFormSuccess("");
    setConfirmStatusChange(false);
    setEditingUser(user);
    setFormData({
      username: user.username || "",
      password: "",
      role: user.role || "Admin",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
    });
    setShowForm(true);
  }

  async function toggleUserStatus(user) {
    const isActive = Boolean(user.is_active);
    const nextStatus = !isActive;
    const action = nextStatus ? "reactivate" : "deactivate";

    setSaving(true);
    setFormError("");
    setFormSuccess("");

    const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "/api");

    try {
      const response = await fetch(`${apiBase}/api/users/${user.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          is_active: nextStatus,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || `Failed to ${action} user.`);
      }

      setFormSuccess(`User ${nextStatus ? "reactivated" : "deactivated"} successfully.`);
      setConfirmStatusChange(false);
      setEditingUser(null);
      resetUserForm();
      setShowForm(false);
      await loadUsers();
    } catch (statusError) {
      setFormError(statusError.message || `Failed to ${action} user.`);
    } finally {
      setSaving(false);
    }
  }

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
        <button
          key={`edit-${user.user_id}`}
          type="button"
          className="min-h-0 border-slate-300 px-3 py-1.5 text-xs"
          onClick={() => openEditUser(user)}
        >
          Edit
        </button>,
      ];
    });
  }, [users]);

  const loadUsers = async() => {
    const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "/api");

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
    setFormSuccess("");
    setEditingUser(null);
    setConfirmStatusChange(false);
    resetUserForm();
    setShowForm(true);
  };

  const closeAddUserModal = () => {
    if (saving) return;
    setFormError("");
    setEditingUser(null);
    setConfirmStatusChange(false);
    resetUserForm();
    setShowForm(false);
  };

  useEffect(() => {
    let isMounted = true;
    const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "/api");

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

  const handleSaveUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormSuccess("");

    const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "/api");
    const isEditing = Boolean(editingUser);

    try {
      const response = await fetch(
        isEditing ? `${apiBase}/api/users/${editingUser.user_id}` : `${apiBase}/api/users`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || `Failed to ${isEditing ? "update" : "create"} user.`);
      }

      resetUserForm();
      setEditingUser(null);
      setShowForm(false);
      setFormSuccess(isEditing ? "User information updated." : "User created successfully.");
      await loadUsers();
    } catch (saveError) {
      setFormError(saveError.message || "Failed to save user.");
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
      {formError && !showForm && <p className="message">{formError}</p>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>{editingUser ? "Edit Staff Account" : "New Staff Account"}</h3>
                <p className="mt-1 text-sm">
                  {editingUser
                    ? "Update this staff account. Leave the password blank if it should stay the same."
                    : "Fill in the staff details below. The selected role controls what modules the user can access."}
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

            <form onSubmit={handleSaveUser}>
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
                  placeholder={editingUser ? "Leave blank to keep current password" : "password"}
                  required={!editingUser}
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
                  {saving ? "Saving..." : editingUser ? "Update User" : "Register User"}
                </button>
              </div>
            </form>

            {editingUser && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="section-header">
                  <div>
                    <h3 className="text-base">Account Access</h3>
                    <p className="mt-1 text-sm">
                      Current status:{" "}
                      <span
                        className={`font-bold ${
                          editingUser.is_active ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {editingUser.is_active ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  {!confirmStatusChange && (
                    <button
                      type="button"
                      className={`${
                        editingUser.is_active
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                      }`}
                      disabled={saving}
                      onClick={() => setConfirmStatusChange(true)}
                    >
                      {editingUser.is_active ? "Deactivate Account" : "Activate Account"}
                    </button>
                  )}
                </div>

                {confirmStatusChange && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">
                      {editingUser.is_active
                        ? `Are you sure you want to deactivate ${editingUser.username}?`
                        : `Are you sure you want to activate ${editingUser.username}?`}
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      {editingUser.is_active
                        ? "When deactivated, this account will not be able to log in."
                        : "When activated, this account can log in again."}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setConfirmStatusChange(false)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`${
                          editingUser.is_active
                            ? "border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700"
                            : "border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700"
                        }`}
                        disabled={saving}
                        onClick={() => toggleUserStatus(editingUser)}
                      >
                        {saving
                          ? "Saving..."
                          : editingUser.is_active
                            ? "Yes, Deactivate"
                            : "Yes, Activate"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
          headers={["ID", "Username", "Name", "Role", "Status", "Created", "Action"]}
          rows={userRows}
        />
      </div>
    </section>
  );
}

export default ManageUsers;
