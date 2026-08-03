import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, ShieldCheck, Users, TrendingUp, TrendingDown, Wallet, X } from "lucide-react";
import Navbar from "../../components/Navbar.jsx";
import api from "../../api/axios.js";

const ROLES = ["SuperAdmin", "IT", "PCM", "MedTech", "Caredx"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const emptyUser = { name: "", email: "", password: "", role: "IT", department: "" };

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes, overviewRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/team-stats"),
        api.get("/admin/overview"),
      ]);
      setUsers(usersRes.data.users);
      setTeamStats(statsRes.data);
      setOverview(overviewRes.data);
    } catch {
      toast.error("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/users", { ...form, department: form.department || form.role });
      toast.success("User created.");
      setFormOpen(false);
      setForm(emptyUser);
      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.errors?.join(" ") || err.response?.data?.message || "Failed to create user.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Remove ${user.name} (${user.role})?`)) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      toast.success("User removed.");
      fetchAll();
    } catch {
      toast.error("Failed to remove user.");
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/admin/users/${user.id}`, { is_active: !user.is_active });
      fetchAll();
    } catch {
      toast.error("Failed to update user.");
    }
  };

  return (
    <div className="page">
      <Navbar title="SuperAdmin Dashboard" roleColor="#7c3aed" />

      <main className="page-main">
        <div className="stat-grid">
          <div className="card stat-card">
            <div className="stat-icon stat-icon--team"><Users size={22} /></div>
            <div>
              <p className="stat-label">Total Team Members</p>
              <p className="stat-value">{overview?.total_members ?? "—"}</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon--active"><ShieldCheck size={22} /></div>
            <div>
              <p className="stat-label">Active Members</p>
              <p className="stat-value">{overview?.active_members ?? "—"}</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon--income"><TrendingUp size={22} /></div>
            <div>
              <p className="stat-label">Platform Income</p>
              <p className="stat-value">{formatCurrency(overview?.total_income)}</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon--expense"><TrendingDown size={22} /></div>
            <div>
              <p className="stat-label">Platform Expenses</p>
              <p className="stat-value">{formatCurrency(overview?.total_expenses)}</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon--profit"><Wallet size={22} /></div>
            <div>
              <p className="stat-label">Platform Profit</p>
              <p className="stat-value">{formatCurrency(overview?.total_profit)}</p>
            </div>
          </div>
        </div>

        {overview?.by_department && (
          <div className="card">
            <p className="section-title" style={{ marginBottom: 16 }}>
              Income / Expenses / Profit by Department
            </p>
            <div className="dept-grid">
              {overview.by_department.map((d) => (
                <div key={d.department} className="dept-card">
                  <p className="dept-card-title">{d.department}</p>
                  <div className="dept-row">
                    <span className="dept-row-label">Income</span>
                    <span className="dept-row-value--income">{formatCurrency(d.income)}</span>
                  </div>
                  <div className="dept-row">
                    <span className="dept-row-label">Expenses</span>
                    <span className="dept-row-value--expense">{formatCurrency(d.expenses)}</span>
                  </div>
                  <div className="dept-row dept-row--total">
                    <span className="dept-row-label">Profit</span>
                    <span className={`dept-row-value--profit ${d.profit < 0 ? "negative" : ""}`}>
                      {formatCurrency(d.profit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {teamStats && (
          <div className="card">
            <p className="section-title" style={{ marginBottom: 16 }}>Team Members by Role</p>
            <div className="role-stat-grid">
              {ROLES.map((role) => {
                const found = teamStats.by_role.find((r) => r.role === role);
                return (
                  <div key={role} className="role-stat">
                    <p className="role-stat-count">{found?.count ?? 0}</p>
                    <p className="role-stat-label">{role}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="section-header">
          <p className="section-title">All Users</p>
          <button onClick={() => setFormOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Add User
          </button>
        </div>

        {loading ? (
          <div className="card empty-state">Loading...</div>
        ) : (
          <div className="card table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: "var(--color-ink-700)" }}>{u.name}</td>
                    <td className="text-muted">{u.email}</td>
                    <td>
                      <span className="badge badge-role">{u.role}</span>
                    </td>
                    <td className="text-muted">{u.department || "—"}</td>
                    <td>
                      <button
                        onClick={() => toggleActive(u)}
                        className={`badge status-toggle ${u.is_active ? "active" : "inactive"}`}
                      >
                        {u.is_active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          onClick={() => handleDelete(u)}
                          className="btn-icon btn-icon--danger"
                          title="Remove user"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {formOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Add New User</h2>
              <button onClick={() => setFormOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-control"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    className="form-control"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder={form.role}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setFormOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
