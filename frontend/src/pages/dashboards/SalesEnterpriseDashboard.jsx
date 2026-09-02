// frontend/src/pages/dashboards/SalesEnterpriseDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar.jsx";
import api from "../../api/axios.js";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const ALL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DEPARTMENTS = ["IT", "IT sales", "MedTech", "CareDx", "PCM"];

// Map quarter to months
const QUARTER_TO_MONTHS = {
  Q1: ["January", "February", "March"],
  Q2: ["April", "May", "June"],
  Q3: ["July", "August", "September"],
  Q4: ["October", "November", "December"]
};

const currentYear = new Date().getFullYear();

export default function SalesEnterpriseDashboard() {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form state
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState("Q1");
  const [department, setDepartment] = useState("IT");
  const [month, setMonth] = useState("January");
  const [availableMonths, setAvailableMonths] = useState(QUARTER_TO_MONTHS.Q1);

  // Filter state for table
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewKpi, setViewKpi] = useState(null);

  const [formData, setFormData] = useState({
    revenue_growth: "",
    win_rate: "",
    stage_conversion: "",
    pipeline_coverage: "",
    sales_cycle_length: "",
    cac: "",
    rep_productivity: "",
    ramp_time: "",
    lead_response_time: "",
    nrr: "",
    quota_attainment: "",
    forecast_accuracy: "",
  });

  // Update available months when quarter changes
  useEffect(() => {
    setAvailableMonths(QUARTER_TO_MONTHS[quarter] || []);
    // If current month is not in the new quarter, reset to first month of that quarter
    if (!QUARTER_TO_MONTHS[quarter].includes(month)) {
      setMonth(QUARTER_TO_MONTHS[quarter][0] || "January");
    }
  }, [quarter, month]);

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/salesenterprise/kpis");
      setKpis(res.data.kpis || []);
    } catch (err) {
      toast.error("Failed to load KPIs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!year || !quarter || !department || !month) {
      toast.error("Year, Quarter, Department, and Month are required.");
      return;
    }
    const payload = {
      year: parseInt(year),
      quarter,
      department,
      month,
      ...formData,
    };
    for (let key in payload) {
      if (payload[key] === "") payload[key] = null;
    }

    try {
      if (editing) {
        await api.put(`/salesenterprise/kpis/${editing}`, payload);
        toast.success("KPI updated");
      } else {
        await api.post("/salesenterprise/kpis", payload);
        toast.success("KPI added");
      }
      setEditing(null);
      resetForm();
      fetchKpis();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save KPI";
      toast.error(msg);
    }
  };

  const handleEdit = (kpi) => {
    setEditing(kpi.id);
    setYear(kpi.year);
    setQuarter(kpi.quarter);
    setDepartment(kpi.department || "IT");
    setMonth(kpi.month || "January");
    setFormData({
      revenue_growth: kpi.revenue_growth ?? "",
      win_rate: kpi.win_rate ?? "",
      stage_conversion: kpi.stage_conversion ?? "",
      pipeline_coverage: kpi.pipeline_coverage ?? "",
      sales_cycle_length: kpi.sales_cycle_length ?? "",
      cac: kpi.cac ?? "",
      rep_productivity: kpi.rep_productivity ?? "",
      ramp_time: kpi.ramp_time ?? "",
      lead_response_time: kpi.lead_response_time ?? "",
      nrr: kpi.nrr ?? "",
      quota_attainment: kpi.quota_attainment ?? "",
      forecast_accuracy: kpi.forecast_accuracy ?? "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this KPI record?")) return;
    try {
      await api.delete(`/salesenterprise/kpis/${id}`);
      toast.success("Deleted");
      fetchKpis();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const resetForm = () => {
    setEditing(null);
    setYear(currentYear);
    setQuarter("Q1");
    setDepartment("IT");
    setMonth("January");
    setFormData({
      revenue_growth: "",
      win_rate: "",
      stage_conversion: "",
      pipeline_coverage: "",
      sales_cycle_length: "",
      cac: "",
      rep_productivity: "",
      ramp_time: "",
      lead_response_time: "",
      nrr: "",
      quota_attainment: "",
      forecast_accuracy: "",
    });
  };

  const cancelEdit = resetForm;

  // Filter KPIs for table
  const filteredKpis = useMemo(() => {
    return kpis.filter(k => {
      let match = true;
      if (filterDepartment !== "All" && k.department !== filterDepartment) match = false;
      if (filterMonth !== "All" && k.month !== filterMonth) match = false;
      return match;
    });
  }, [kpis, filterDepartment, filterMonth]);

  const handleView = (kpi) => {
    setViewKpi(kpi);
    setViewModalOpen(true);
  };

  return (
    <div className="page">
      <Navbar title="Sales Enterprise Dashboard" roleColor="#f97316" />
      <main className="page-main">
        {/* Add/Edit Form */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2>{editing ? "Edit" : "Add"} KPI for Quarter</h2>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label>Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>Quarter</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="form-control"
                  required
                >
                  {QUARTERS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="form-control"
                  required
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="form-control"
                  required
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              {Object.keys(formData).map((key) => (
                <div className="form-group" key={key} style={{ flex: "1 1 150px" }}>
                  <label>{key.replace(/_/g, " ").toUpperCase()}</label>
                  <input
                    type="number"
                    step="0.01"
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    placeholder="—"
                    className="form-control"
                  />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              {editing && (
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn-primary">
                {editing ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>

        {/* Table with Filter Bar */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Existing KPIs</h3>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label style={{ fontSize: "0.9rem" }}>Filter by Department:</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="form-control"
                style={{ width: "auto", minWidth: 120 }}
              >
                <option value="All">All</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <label style={{ fontSize: "0.9rem" }}>Month:</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="form-control"
                style={{ width: "auto", minWidth: 120 }}
              >
                <option value="All">All</option>
                {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Quarter</th>
                    <th>Department</th>
                    <th>Month</th>
                    <th>Rev Growth</th>
                    <th>Win Rate</th>
                    <th>Stage Conv</th>
                    <th>Pipeline Cov</th>
                    <th>Sales Cycle</th>
                    <th>CAC</th>
                    <th>Rep Prod</th>
                    <th>Ramp</th>
                    <th>Lead Resp</th>
                    <th>NRR</th>
                    <th>Quota Att</th>
                    <th>Forecast Acc</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKpis.length === 0 ? (
                    <tr><td colSpan="17" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>No records match the filters.</td></tr>
                  ) : (
                    filteredKpis.map((k) => (
                      <tr key={k.id}>
                        <td>{k.year}</td>
                        <td>{k.quarter}</td>
                        <td>{k.department || "—"}</td>
                        <td>{k.month || "—"}</td>
                        <td>{k.revenue_growth ?? "—"}</td>
                        <td>{k.win_rate ?? "—"}</td>
                        <td>{k.stage_conversion ?? "—"}</td>
                        <td>{k.pipeline_coverage ?? "—"}</td>
                        <td>{k.sales_cycle_length ?? "—"}</td>
                        <td>{k.cac ?? "—"}</td>
                        <td>{k.rep_productivity ?? "—"}</td>
                        <td>{k.ramp_time ?? "—"}</td>
                        <td>{k.lead_response_time ?? "—"}</td>
                        <td>{k.nrr ?? "—"}</td>
                        <td>{k.quota_attainment ?? "—"}</td>
                        <td>{k.forecast_accuracy ?? "—"}</td>
                        <td>
                          <button className="btn-icon" onClick={() => handleView(k)} title="View">
                            👁️
                          </button>
                          <button className="btn-icon" onClick={() => handleEdit(k)} title="Edit">
                            ✏️
                          </button>
                          <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(k.id)} title="Delete">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* View Modal */}
      {viewModalOpen && viewKpi && (
        <div className="modal-overlay" onClick={() => setViewModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>KPI Details</h3>
              <button className="btn-icon" onClick={() => setViewModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><strong>Year:</strong> {viewKpi.year}</div>
                <div><strong>Quarter:</strong> {viewKpi.quarter}</div>
                <div><strong>Department:</strong> {viewKpi.department || "—"}</div>
                <div><strong>Month:</strong> {viewKpi.month || "—"}</div>
                {Object.keys(KPI_DISPLAY_NAMES).map(key => (
                  <div key={key}>
                    <strong>{KPI_DISPLAY_NAMES[key]}:</strong> {viewKpi[key] ?? "—"}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Styles for modal (add to your global CSS or inline) */}
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: white;
          border-radius: 8px;
          max-width: 700px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .modal-body {
          margin-bottom: 16px;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
        }
      `}</style>
    </div>
  );
}

// Display names for modal (reuse from earlier, or define here)
const KPI_DISPLAY_NAMES = {
  revenue_growth: "Revenue Growth Rate",
  win_rate: "Win Rate",
  stage_conversion: "Stage Conversion Rate",
  pipeline_coverage: "Pipeline Coverage",
  sales_cycle_length: "Sales Cycle Length",
  cac: "Customer Acquisition Cost (CAC)",
  rep_productivity: "Rep Productivity",
  ramp_time: "Ramp Time",
  lead_response_time: "Lead Response Time",
  nrr: "Net Revenue Retention (NRR)",
  quota_attainment: "Quota Attainment",
  forecast_accuracy: "Forecast Accuracy"
};