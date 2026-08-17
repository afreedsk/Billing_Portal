import React, { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  Users, TrendingUp, TrendingDown, Wallet,
  Search, Upload, Download, RotateCcw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import Navbar from "../../components/Navbar.jsx";
import StatCards from "../../components/StatCards.jsx";
import FinanceCharts from "../../components/FinanceCharts.jsx";
import FinanceTable from "../../components/FinanceTable.jsx";
import api from "../../api/axios.js";

const DEPARTMENTS = ["IT", "PCM", "MedTech", "Caredx"];
const PIE_COLORS = ["#2f5dd4", "#16a34a", "#d97706", "#8b5cf6", "#dc2626"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};
const todayStr = () => new Date().toISOString().split("T")[0];

export default function SuperAdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeDept, setActiveDept] = useState("overview");

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(todayStr());
  const [searchTerm, setSearchTerm] = useState("");

  const [deptEntries, setDeptEntries] = useState([]);
  const [deptSummary, setDeptSummary] = useState(null);

  const [caredxLabEntries, setCaredxLabEntries] = useState([]);
  const [caredxExpenses, setCaredxExpenses] = useState([]);

  const [deptLoading, setDeptLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // ----- Overview fetching (with date filters) -----
  const fetchOverview = useCallback(async (start, end) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/overview", {
        params: { start_date: start, end_date: end },
      });
      setOverview(res.data);
    } catch {
      toast.error("Failed to load admin overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch overview whenever date range changes (only in overview mode)
  useEffect(() => {
    if (activeDept === "overview") {
      fetchOverview(startDate, endDate);
    }
  }, [activeDept, startDate, endDate, fetchOverview]);

  // ----- Department data fetching -----
  const fetchDeptData = useCallback(async () => {
    if (activeDept === "overview") return;
    setDeptLoading(true);
    try {
      if (activeDept === "Caredx") {
        const [entriesRes, summaryRes] = await Promise.all([
          api.get(`/admin/departments/Caredx/entries`, {
            params: { start_date: startDate, end_date: endDate, search: searchTerm || undefined },
          }),
          api.get(`/admin/departments/Caredx/summary`, { params: { start_date: startDate, end_date: endDate } }),
        ]);
        setCaredxLabEntries(entriesRes.data.lab_entries);
        setCaredxExpenses(entriesRes.data.expenses);
        setDeptSummary(summaryRes.data);
      } else {
        const [entriesRes, summaryRes] = await Promise.all([
          api.get(`/admin/departments/${activeDept}/entries`, {
            params: { start_date: startDate, end_date: endDate, search: searchTerm || undefined },
          }),
          api.get(`/admin/departments/${activeDept}/summary`, { params: { start_date: startDate, end_date: endDate } }),
        ]);
        setDeptEntries(entriesRes.data.entries);
        setDeptSummary(summaryRes.data);
      }
    } catch {
      toast.error(`Failed to load ${activeDept} data.`);
    } finally {
      setDeptLoading(false);
    }
  }, [activeDept, startDate, endDate, searchTerm]);

  useEffect(() => {
    fetchDeptData();
  }, [fetchDeptData]);

  const handleSelectDept = (dept) => {
    setActiveDept(dept);
    setStartDate(firstOfMonth());
    setEndDate(todayStr());
    setSearchTerm("");
    setDeptEntries([]);
    setCaredxLabEntries([]);
    setCaredxExpenses([]);
    setDeptSummary(null);
  };

  const handleResetFilters = () => {
    setStartDate(firstOfMonth());
    setEndDate(todayStr());
    setSearchTerm("");
  };

  const handleExportExcel = async () => {
    try {
      const res = await api.get(`/admin/departments/${activeDept}/export`, {
        params: { start_date: startDate, end_date: endDate },
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeDept}_${startDate}_to_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export Excel file.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setImporting(true);
    try {
      const res = await api.post(`/admin/departments/${activeDept}/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { imported, errors } = res.data;
      if (imported > 0) {
        toast.success(`Imported ${imported} entr${imported === 1 ? "y" : "ies"} into ${activeDept}.`);
      }
      if (errors && errors.length) {
        toast.error(`${errors.length} row(s) skipped — check the sheet formatting.`);
      }
      fetchDeptData();
      fetchOverview(startDate, endDate);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to import the Excel file.";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const pieData = (overview?.by_department || []).map((d) => ({
    name: d.department,
    value: d.income + d.expenses,
  }));

  return (
    <div className="page">
      <Navbar title="SuperAdmin Dashboard" roleColor="#7c3aed" />

      <main className="page-main">
        {/* ---------------- Top filter bar ---------------- */}
        <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Department</label>
            <select
              className="form-control"
              value={activeDept}
              onChange={(e) => handleSelectDept(e.target.value)}
            >
              <option value="overview">Overview</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Date filters – always visible */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button type="button" onClick={handleResetFilters} className="btn btn-secondary">
            <RotateCcw size={15} /> Reset
          </button>

          {/* Department‑only actions */}
          {activeDept !== "overview" && (
            <>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                <label className="form-label">Search</label>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
                  <input
                    className="form-control"
                    style={{ paddingLeft: 32 }}
                    placeholder={`Search ${activeDept} entries...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <button type="button" onClick={handleExportExcel} className="btn btn-secondary">
                <Download size={15} /> Export Excel
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xlsm"
                style={{ display: "none" }}
                onChange={handleImportFileChange}
              />
              <button type="button" onClick={handleImportClick} disabled={importing} className="btn btn-secondary">
                <Upload size={15} /> {importing ? "Importing..." : "Import Excel"}
              </button>
            </>
          )}
        </div>

        {/* ---------------- Platform stat cards ---------------- */}
        <div className="stat-grid">
          <div className="card stat-card">
            <div className="stat-icon stat-icon--team"><Users size={22} /></div>
            <div>
              <p className="stat-label">Total Team Members</p>
              <p className="stat-value">{overview?.total_members ?? "—"}</p>
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
                <button
                  key={d.department}
                  type="button"
                  onClick={() => handleSelectDept(d.department)}
                  className="dept-card"
                  style={{ textAlign: "left", cursor: "pointer", border: activeDept === d.department ? "2px solid #7c3aed" : undefined }}
                >
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
                </button>
              ))}
            </div>
          </div>
        )}

        {activeDept === "overview" && overview?.by_department && (
          <div className="chart-grid">
            <div className="card chart-card">
              <h3>Income vs Expenses by Department</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={overview.by_department}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
                  <XAxis dataKey="department" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="income" fill="#16a34a" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#dc2626" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card chart-card">
              <h3>Department Share of Total Volume</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => entry.name}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeDept !== "overview" && (
          <>
            {deptSummary && (
              <StatCards
                totalIncome={deptSummary.total_income}
                totalExpenses={deptSummary.total_expenses}
                profit={deptSummary.profit}
                entryCount={deptSummary.entry_count}
              />
            )}

            {deptSummary && (
              <FinanceCharts trend={deptSummary.trend} categoryBreakdown={deptSummary.category_breakdown} />
            )}

            {deptLoading ? (
              <div className="card empty-state">Loading...</div>
            ) : activeDept === "Caredx" ? (
              <>
                <div>
                  <p className="section-title" style={{ marginBottom: 12 }}>Lab Data Entries</p>
                  {caredxLabEntries.length === 0 ? (
                    <div className="card empty-state">No lab entries found for this filter.</div>
                  ) : (
                    <div className="card table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Patient</th>
                            <th>Test</th>
                            <th>Employee</th>
                            <th className="text-right">Total Paid</th>
                            <th>Referral By</th>
                            <th className="text-right">Referral Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {caredxLabEntries.map((e) => (
                            <tr key={e.id}>
                              <td style={{ whiteSpace: "nowrap" }}>{e.entry_date}</td>
                              <td>{e.patient_name}</td>
                              <td>{e.test_name}</td>
                              <td>{e.employee_name || "—"}</td>
                              <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(e.total_amount_paid)}</td>
                              <td>{e.referral_by || "—"}</td>
                              <td className="text-right">{formatCurrency(e.referral_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <p className="section-title" style={{ marginBottom: 12 }}>Expenses</p>
                  {caredxExpenses.length === 0 ? (
                    <div className="card empty-state">No expenses found for this filter.</div>
                  ) : (
                    <div className="card table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th className="text-right">Amount</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {caredxExpenses.map((e) => (
                            <tr key={e.id}>
                              <td style={{ whiteSpace: "nowrap" }}>{e.expense_date}</td>
                              <td>{e.category}</td>
                              <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                              <td className="truncate">{e.remarks || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div>
                <p className="section-title" style={{ marginBottom: 12 }}>{activeDept} Finance Entries</p>
                <FinanceTable entries={deptEntries} onEdit={() => {}} onDelete={() => {}} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}