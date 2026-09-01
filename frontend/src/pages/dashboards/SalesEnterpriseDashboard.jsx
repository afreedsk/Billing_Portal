// frontend/src/pages/dashboards/SalesEnterpriseDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar.jsx";
import api from "../../api/axios.js";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const currentYear = new Date().getFullYear();

export default function SalesEnterpriseDashboard() {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form state
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState("Q1");
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
    // Validate
    if (!year || !quarter) {
      toast.error("Year and quarter are required.");
      return;
    }
    const payload = { year: parseInt(year), quarter, ...formData };
    // Convert empty strings to null
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
      setFormData({
        revenue_growth: "", win_rate: "", stage_conversion: "", pipeline_coverage: "",
        sales_cycle_length: "", cac: "", rep_productivity: "", ramp_time: "",
        lead_response_time: "", nrr: "", quota_attainment: "", forecast_accuracy: "",
      });
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

  const cancelEdit = () => {
    setEditing(null);
    setFormData({
      revenue_growth: "", win_rate: "", stage_conversion: "", pipeline_coverage: "",
      sales_cycle_length: "", cac: "", rep_productivity: "", ramp_time: "",
      lead_response_time: "", nrr: "", quota_attainment: "", forecast_accuracy: "",
    });
  };

  return (
    <div className="page">
      <Navbar title="Sales Enterprise Dashboard" roleColor="#f97316" />
      <main className="page-main">
        <div className="card" style={{ marginBottom: 24 }}>
          <h2>{editing ? "Edit" : "Add"} KPI for Quarter</h2>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label>Year</label>
                <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="form-control" required />
              </div>
              <div className="form-group">
                <label>Quarter</label>
                <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="form-control">
                  {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              {Object.keys(formData).map(key => (
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
              {editing && <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>}
              <button type="submit" className="btn btn-primary">{editing ? "Update" : "Save"}</button>
            </div>
          </form>
        </div>

        <h3>Existing KPIs</h3>
        {loading ? <div>Loading...</div> : (
          <div className="card table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Year</th><th>Quarter</th><th>Rev Growth</th><th>Win Rate</th><th>Stage Conv</th><th>Pipeline Cov</th><th>Sales Cycle</th><th>CAC</th><th>Rep Prod</th><th>Ramp</th><th>Lead Resp</th><th>NRR</th><th>Quota Att</th><th>Forecast Acc</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {kpis.map(k => (
                  <tr key={k.id}>
                    <td>{k.year}</td><td>{k.quarter}</td>
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
                      <button className="btn-icon" onClick={() => handleEdit(k)} title="Edit">✏️</button>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(k.id)} title="Delete">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}