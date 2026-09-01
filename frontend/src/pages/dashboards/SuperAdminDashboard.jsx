// frontend/src/pages/dashboards/SuperAdminDashboard.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  Users, TrendingUp, TrendingDown, Wallet,
  Search, Upload, Download, RotateCcw, Eye,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import Navbar from "../../components/Navbar.jsx";
import StatCards from "../../components/StatCards.jsx";
import FinanceCharts from "../../components/FinanceCharts.jsx";
import FinanceTable from "../../components/FinanceTable.jsx";
import EntryViewModal from "../../components/EntryViewModal.jsx";
import ThreeDChart from "../../components/ThreeDChart.jsx";
import api from "../../api/axios.js";

// ------------------------------------------------------------------
// Configuration - Department order and labels
// ------------------------------------------------------------------
const DEPARTMENTS_CONFIG = [
  { label: "Overview", value: "overview" },
  { label: "Corporate Management", value: "Corporate" },
  { label: "Office Administration", value: "Adminstrationfunctionalunit" },
  { label: "CareDx", value: "Caredx" },
  { label: "IT Development", value: "IT" },
  { label: "IT Sales", value: "IT Sales" },
  { label: "MedTech", value: "MedTech" },
  { label: "PCM", value: "PCM" },
  { label: "Research Development", value: "ResearchDevelopment" },
  { label: "Dental", value: "Dental" },
  { label: "Sales Enterprise", value: "SalesEnterprise" },
];

const PIE_COLORS = ["#2f5dd4", "#16a34a", "#d97706", "#8b5cf6", "#dc2626", "#0ea5e9", "#8b5cf6"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const firstOfMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};
const todayStr = () => new Date().toISOString().split("T")[0];

export default function SuperAdminDashboard() {
  // ---------- State ----------
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeDept, setActiveDept] = useState("overview");
  const [activeExtra, setActiveExtra] = useState(null);

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(todayStr());
  const [searchTerm, setSearchTerm] = useState("");

  // SalesEnterprise specific
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSubDept, setSelectedSubDept] = useState("All");
  const [salesSelectedDept, setSalesSelectedDept] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [caredxSection, setCaredxSection] = useState("lab");
  const [departmentOptions, setDepartmentOptions] = useState(null);

  // Pagination (only used for non-SalesEnterprise dept views)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [deptEntries, setDeptEntries] = useState([]);
  const [deptSummary, setDeptSummary] = useState(null);
  const [caredxLabEntries, setCaredxLabEntries] = useState([]);
  const [caredxExpenses, setCaredxExpenses] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [viewEntry, setViewEntry] = useState(null);

  // ---------- Effect: update start/end when quarter/year change for SalesEnterprise ----------
  useEffect(() => {
    if (activeDept !== "SalesEnterprise") return;
    if (!selectedYear) return;

    const year = parseInt(selectedYear, 10);
    let start, end;
    if (selectedQuarter === "") {
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
    } else {
      const q = parseInt(selectedQuarter, 10);
      if (q === 1) { start = new Date(year, 0, 1); end = new Date(year, 2, 31); }
      else if (q === 2) { start = new Date(year, 3, 1); end = new Date(year, 5, 30); }
      else if (q === 3) { start = new Date(year, 6, 1); end = new Date(year, 8, 30); }
      else if (q === 4) { start = new Date(year, 9, 1); end = new Date(year, 11, 31); }
      else return;
    }
    if (start && end) {
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    }
  }, [selectedQuarter, selectedYear, activeDept]);

  // ---------- API calls ----------
  const fetchOptions = useCallback(async (dept) => {
    if (dept === "overview" || dept === "SalesEnterprise") {
      setDepartmentOptions(null);
      return;
    }
    try {
      const res = await api.get(`/admin/departments/${dept}/options`);
      setDepartmentOptions(res.data);
    } catch {
      toast.error("Failed to load department options.");
    }
  }, []);

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

  const fetchDeptSummaryOnly = useCallback(async (dept, start, end) => {
    setDeptLoading(true);
    try {
      const params = { start_date: start, end_date: end };
      const summaryRes = await api.get(`/admin/departments/${dept}/summary`, { params });
      setDeptSummary(summaryRes.data);
    } catch (err) {
      toast.error(`Failed to load ${dept} summary.`);
      console.error(err);
    } finally {
      setDeptLoading(false);
    }
  }, []);

  const fetchDeptData = useCallback(async () => {
    if (activeDept === "overview" || activeDept === "SalesEnterprise") return;
    setDeptLoading(true);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        search: searchTerm || undefined,
        ...(activeExtra?.revenue_type && { revenue_type: activeExtra.revenue_type }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(activeDept === "Caredx" && { section: caredxSection }),
        page: page,
        per_page: perPage,
      };

      const entriesRes = await api.get(`/admin/departments/${activeDept}/entries`, { params });
      const summaryParams = {
        start_date: startDate,
        end_date: endDate,
        ...(activeExtra?.revenue_type && { revenue_type: activeExtra.revenue_type }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(activeDept === "Caredx" && { section: caredxSection }),
      };
      const summaryRes = await api.get(`/admin/departments/${activeDept}/summary`, { params: summaryParams });

      const pagination = entriesRes.data.pagination || {};
      setTotalEntries(pagination.total || 0);
      setTotalPages(pagination.pages || 0);
      setPage(pagination.page || 1);

      if (activeDept === "Caredx") {
        setCaredxLabEntries(entriesRes.data.lab_entries || []);
        setCaredxExpenses(entriesRes.data.expenses || []);
      } else {
        setDeptEntries(entriesRes.data.entries || []);
      }
      setDeptSummary(summaryRes.data);
    } catch (err) {
      toast.error(`Failed to load ${activeDept} data.`);
      console.error(err);
    } finally {
      setDeptLoading(false);
    }
  }, [activeDept, activeExtra, startDate, endDate, searchTerm, selectedCategory, caredxSection, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, searchTerm, selectedCategory, caredxSection]);

  useEffect(() => {
    fetchOptions(activeDept);
  }, [activeDept, fetchOptions]);

  useEffect(() => {
    if (activeDept === "overview") {
      fetchOverview(startDate, endDate);
    } else if (activeDept === "SalesEnterprise") {
      // Always fetch overview for department cards (filtered by quarter/year)
      fetchOverview(startDate, endDate);
      // If a specific department is selected, fetch its summary for Summary & Display panels
      if (salesSelectedDept) {
        fetchDeptSummaryOnly(salesSelectedDept, startDate, endDate);
      } else {
        // No department selected – use overview data for summary panel as well
        setDeptSummary(null); // clear previous summary
      }
    } else {
      fetchDeptData();
    }
  }, [activeDept, startDate, endDate, fetchOverview, fetchDeptData, fetchDeptSummaryOnly, salesSelectedDept]);

  // ---------- Handlers ----------
  const handleSelectDept = (value) => {
    const config = DEPARTMENTS_CONFIG.find(d => d.value === value);
    if (!config) return;

    // If we are in SalesEnterprise view and the clicked department is not SalesEnterprise,
    // we stay in SalesEnterprise view but change the selected department for display.
    if (activeDept === "SalesEnterprise" && value !== "SalesEnterprise" && value !== "overview") {
      setSalesSelectedDept(value);
      // Reset transactional data (not used in this view)
      setDeptEntries([]);
      setCaredxLabEntries([]);
      setCaredxExpenses([]);
      setTotalEntries(0);
      setTotalPages(0);
      setPage(1);
      return;
    }

    // Normal department switch (overview or other departments)
    setActiveDept(value);
    setActiveExtra(config.extra || null);
    // Reset filters
    setStartDate(firstOfMonth());
    setEndDate(todayStr());
    setSearchTerm("");
    setSelectedCategory(null);
    setCaredxSection("lab");
    setSelectedQuarter("");
    setSelectedYear("");
    setSelectedSubDept("All");
    setSalesSelectedDept(null);
    setDeptEntries([]);
    setCaredxLabEntries([]);
    setCaredxExpenses([]);
    setDeptSummary(null);
    setPage(1);
    setTotalEntries(0);
    setTotalPages(0);
  };

  const handleResetFilters = () => {
    setStartDate(firstOfMonth());
    setEndDate(todayStr());
    setSearchTerm("");
    setSelectedCategory(null);
    setCaredxSection("lab");
    setSelectedQuarter("");
    setSelectedYear("");
    setSelectedSubDept("All");
    setSalesSelectedDept(null);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(prev => (prev === cat ? null : cat));
    setPage(1);
  };

  const handleCaredxSectionChange = (section) => {
    setCaredxSection(section);
    setSelectedCategory(null);
    setPage(1);
  };

  const handleExportExcel = async () => {
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        ...(activeExtra?.revenue_type && { revenue_type: activeExtra.revenue_type }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(activeDept === "Caredx" && { section: caredxSection }),
      };
      const res = await api.get(`/admin/departments/${activeDept}/export`, {
        params,
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
      if (activeDept === "overview") {
        fetchOverview(startDate, endDate);
      } else {
        fetchDeptData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to import the Excel file.";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  // ---------- Derived data ----------
  const currentDeptLabel = DEPARTMENTS_CONFIG.find(d => d.value === activeDept)?.label || activeDept;

  let categories = [];
  if (departmentOptions?.categories) {
    if (activeDept === "Caredx" && caredxSection === "expenses") {
      categories = (departmentOptions.categories.Expenses || [])
        .filter(c => {
          const lower = c.trim().toLowerCase();
          return lower !== "others" && lower !== "other";
        });
    } else if (activeDept === "Caredx" && caredxSection === "lab") {
      categories = [];
    } else {
      const allCats = new Set();
      Object.values(departmentOptions.categories).forEach(catList => catList.forEach(c => allCats.add(c)));
      categories = Array.from(allCats).filter(c => {
        const lower = c.trim().toLowerCase();
        return lower !== "others" && lower !== "other";
      });
    }
  }

  const sortedDepartments = React.useMemo(() => {
    if (!overview?.by_department) return [];
    const deptDataMap = {};
    overview.by_department.forEach(d => {
      deptDataMap[d.department] = d;
    });

    const allDepts = DEPARTMENTS_CONFIG
      .filter(c => c.value !== "overview")
      .map(c => c.value);

    return allDepts.map(dept => {
      const data = deptDataMap[dept];
      if (data) {
        return data;
      } else {
        return {
          department: dept,
          income: 0,
          expenses: 0,
          profit: 0,
        };
      }
    });
  }, [overview]);

  const pieData = (overview?.by_department || []).map((d) => ({
    name: d.department,
    value: d.income + d.expenses,
  }));

  // ---------- Pagination Render ----------
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="pagination" style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16, alignItems: "center" }}>
        <button
          className="btn btn-secondary"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <span style={{ display: "flex", alignItems: "center" }}>
          Page {page} of {totalPages} (Total {totalEntries} entries)
        </span>
        <button
          className="btn btn-secondary"
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next
        </button>
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value));
            setPage(1);
          }}
          style={{ marginLeft: 12, padding: "6px 10px", borderRadius: 4 }}
        >
          <option value={10}>10 per page</option>
          <option value={30}>30 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>
    );
  };

  // ---------- Render ----------
  return (
    <div className="page">
      <Navbar title="CEO Dashboard" roleColor="#7c3aed" />

      <main className="page-main">
        {/* ========== FILTER PANEL ========== */}
        <p className="section-title" style={{ marginBottom: 8 }}>Filter Panel</p>
        <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Department</label>
            <select
              className="form-control"
              value={activeDept}
              onChange={(e) => handleSelectDept(e.target.value)}
            >
              {DEPARTMENTS_CONFIG.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {activeDept !== "SalesEnterprise" && (
            <>
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
            </>
          )}

          {activeDept === "SalesEnterprise" && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Quarter</label>
                <select
                  className="form-control"
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="1">Q1 (Jan–Mar)</option>
                  <option value="2">Q2 (Apr–Jun)</option>
                  <option value="3">Q3 (Jul–Sep)</option>
                  <option value="4">Q4 (Oct–Dec)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Year</label>
                <select
                  className="form-control"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const y = new Date().getFullYear() - i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Sub-Department</label>
                <select
                  className="form-control"
                  value={selectedSubDept}
                  onChange={(e) => setSelectedSubDept(e.target.value)}
                  style={{ minWidth: 150 }}
                >
                  <option value="All">All</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="SMB">SMB</option>
                  <option value="Public Sector">Public Sector</option>
                </select>
              </div>
            </>
          )}

          <button type="button" onClick={handleResetFilters} className="btn btn-secondary">
            <RotateCcw size={15} /> Reset
          </button>

          {activeDept !== "overview" && activeDept !== "SalesEnterprise" && (
            <>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                <label className="form-label">Search</label>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
                  <input
                    className="form-control"
                    style={{ paddingLeft: 32 }}
                    placeholder={`Search ${currentDeptLabel} entries...`}
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

        {/* ========== OVERVIEW VIEW ========== */}
        {activeDept === "overview" && (
          <>
            <p className="section-title" style={{ marginBottom: 8 }}>Summary Panel</p>
            <div className="stat-grid">
              <div className="card stat-card">
                <div className="stat-icon stat-icon--team"><Users size={22} /></div>
                <div>
                  <p className="stat-label">Total Departments</p>
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
              <>
                <p className="section-title" style={{ marginBottom: 8 }}>Categories Panel</p>
                <div className="card">
                  <p className="section-title" style={{ marginBottom: 16 }}>
                    Income / Expenses / Profit by Department
                  </p>
                  <div className="dept-grid">
                    {sortedDepartments.map((d) => {
                      const config = DEPARTMENTS_CONFIG.find(c => c.value === d.department);
                      const label = config ? config.label : d.department;
                      return (
                        <button
                          key={d.department}
                          type="button"
                          onClick={() => handleSelectDept(d.department)}
                          className="dept-card"
                          style={{ textAlign: "left", cursor: "pointer", border: activeDept === d.department ? "2px solid #7c3aed" : undefined }}
                        >
                          <p className="dept-card-title">{label}</p>
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
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {overview?.by_department && (
              <>
                <p className="section-title" style={{ marginBottom: 8 }}>Display Panel</p>
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
                          cx="50%" cy="50%"
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
              </>
            )}
          </>
        )}

        {/* ========== SALES ENTERPRISE VIEW ========== */}
        {activeDept === "SalesEnterprise" && (
          <>
            {loading || deptLoading ? (
              <div className="card empty-state">Loading...</div>
            ) : (
              <>
                {/* SUMMARY PANEL */}
                <p className="section-title" style={{ marginBottom: 8 }}>
                  Summary Panel {selectedSubDept !== "All" ? `– ${selectedSubDept}` : ""}
                  {salesSelectedDept && ` (${DEPARTMENTS_CONFIG.find(d => d.value === salesSelectedDept)?.label || salesSelectedDept})`}
                </p>
                {deptSummary ? (
                  <StatCards
                    totalIncome={deptSummary.total_income}
                    totalExpenses={deptSummary.total_expenses}
                    profit={deptSummary.profit}
                    entryCount={deptSummary.entry_count}
                  />
                ) : (
                  <div className="stat-grid">
                    <div className="card stat-card">
                      <div className="stat-icon stat-icon--team"><Users size={22} /></div>
                      <div>
                        <p className="stat-label">Total Departments</p>
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
                )}

                {/* CATEGORIES PANEL (Department Cards – always show overview data) */}
                {overview?.by_department && (
                  <>
                    <p className="section-title" style={{ marginBottom: 8 }}>Categories Panel</p>
                    <div className="card">
                      <p className="section-title" style={{ marginBottom: 16 }}>
                        Income / Expenses / Profit by Department
                      </p>
                      <div className="dept-grid">
                        {sortedDepartments.map((d) => {
                          const config = DEPARTMENTS_CONFIG.find(c => c.value === d.department);
                          const label = config ? config.label : d.department;
                          const isSelected = salesSelectedDept === d.department;
                          return (
                            <button
                              key={d.department}
                              type="button"
                              onClick={() => handleSelectDept(d.department)}
                              className="dept-card"
                              style={{
                                textAlign: "left",
                                cursor: "pointer",
                                border: isSelected ? "2px solid #7c3aed" : undefined,
                                backgroundColor: isSelected ? "#f0f0ff" : undefined,
                              }}
                            >
                              <p className="dept-card-title">{label}</p>
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
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* DISPLAY PANEL (4 charts) */}
                <p className="section-title" style={{ marginBottom: 8 }}>
                  Display Panel {selectedSubDept !== "All" ? `– ${selectedSubDept}` : ""}
                  {salesSelectedDept && ` (${DEPARTMENTS_CONFIG.find(d => d.value === salesSelectedDept)?.label || salesSelectedDept})`}
                </p>
                {deptSummary ? (
                  <div className="chart-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="card chart-card">
                      <h3>Category Breakdown</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={deptSummary.category_breakdown || []}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%" cy="50%"
                            outerRadius={90}
                            label
                          >
                            {(deptSummary.category_breakdown || []).map((_, idx) => (
                              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card chart-card">
                      <h3>Income vs Expenses Trend</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={deptSummary.trend || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                          <Legend />
                          <Line type="monotone" dataKey="income" stroke="#16a34a" name="Income" />
                          <Line type="monotone" dataKey="expenses" stroke="#dc2626" name="Expenses" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card chart-card">
                      <h3>Amount by Category</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={deptSummary.category_breakdown || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                          <Legend />
                          <Bar dataKey="amount" fill="#2f5dd4" name="Amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card chart-card">
                      <h3>3D Revenue View</h3>
                      <ThreeDChart data={deptSummary.category_breakdown || []} />
                    </div>
                  </div>
                ) : overview?.by_department ? (
                  <div className="chart-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="card chart-card">
                      <h3>Department Share of Total Volume</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%" cy="50%"
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
                    <div className="card chart-card">
                      <h3>Income vs Expenses by Department</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={overview.by_department}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="department" />
                          <YAxis />
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                          <Legend />
                          <Line type="monotone" dataKey="income" stroke="#16a34a" name="Income" />
                          <Line type="monotone" dataKey="expenses" stroke="#dc2626" name="Expenses" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card chart-card">
                      <h3>Income vs Expenses (Bar)</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={overview.by_department}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="department" />
                          <YAxis />
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                          <Legend />
                          <Bar dataKey="income" fill="#16a34a" name="Income" />
                          <Bar dataKey="expenses" fill="#dc2626" name="Expenses" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card chart-card">
                      <h3>3D Revenue View</h3>
                      <ThreeDChart data={overview.by_department.map(d => ({ category: d.department, amount: d.income + d.expenses }))} />
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}

        {/* ========== OTHER DEPARTMENTS ========== */}
        {activeDept !== "overview" && activeDept !== "SalesEnterprise" && (
          <>
            {deptSummary && (
              <>
                <p className="section-title" style={{ marginBottom: 8 }}>Summary Panel</p>
                <StatCards
                  totalIncome={deptSummary.total_income}
                  totalExpenses={deptSummary.total_expenses}
                  profit={deptSummary.profit}
                  entryCount={deptSummary.entry_count}
                />
              </>
            )}

            {deptSummary && (
              <>
                <p className="section-title" style={{ marginBottom: 8 }}>Display Panel</p>
                <FinanceCharts trend={deptSummary.trend} categoryBreakdown={deptSummary.category_breakdown} />
              </>
            )}

            {activeDept === "Caredx" && (
              <div className="card" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <button
                  className={`btn ${caredxSection === "lab" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => handleCaredxSectionChange("lab")}
                >
                  Caredx Lab Revenue
                </button>
                <button
                  className={`btn ${caredxSection === "expenses" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => handleCaredxSectionChange("expenses")}
                >
                  Caredx Expenses
                </button>
              </div>
            )}

            {categories.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <p className="section-title" style={{ marginBottom: 12 }}>Categories</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      className={`btn ${selectedCategory === cat ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => handleCategoryClick(cat)}
                      style={{ padding: "8px 16px", borderRadius: 20, fontSize: 14 }}
                    >
                      {cat}
                    </button>
                  ))}
                  {selectedCategory && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedCategory(null)}
                      style={{ padding: "8px 16px", borderRadius: 20, fontSize: 14 }}
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>
            )}

            {deptLoading ? (
              <div className="card empty-state">Loading...</div>
            ) : activeDept === "Caredx" ? (
              <>
                {caredxSection === "lab" && (
                  <div>
                    <p className="section-title" style={{ marginBottom: 8 }}>Transactional Panel</p>
                    <p className="section-title" style={{ marginBottom: 12 }}>Lab Data Entries</p>
                    {caredxLabEntries.length === 0 ? (
                      <div className="card empty-state">No lab entries found for this filter.</div>
                    ) : (
                      <div className="card table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Date</th><th>Patient</th><th>Test</th><th>Employee</th>
                              <th className="text-right">Total Paid</th><th>Referral By</th>
                              <th className="text-right">Referral Amount</th>
                              <th>Actions</th>
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
                                <td>
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => setViewEntry({ type: "lab", data: e })}
                                    title="View"
                                  >
                                    <Eye size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {renderPagination()}
                      </div>
                    )}
                  </div>
                )}

                {caredxSection === "expenses" && (
                  <div>
                    <p className="section-title" style={{ marginBottom: 8 }}>Transactional Panel</p>
                    <p className="section-title" style={{ marginBottom: 12 }}>Expenses</p>
                    {caredxExpenses.length === 0 ? (
                      <div className="card empty-state">No expenses found for this filter.</div>
                    ) : (
                      <div className="card table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Date</th><th>Category</th>
                              <th className="text-right">Amount</th>
                              <th>Remarks</th>
                              <th className="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {caredxExpenses.map((e) => (
                              <tr key={e.id || e._key}>
                                <td style={{ whiteSpace: "nowrap" }}>{e.expense_date || e.entry_date}</td>
                                <td>{e.category}</td>
                                <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                                <td className="truncate">
                                  {e.remarks || (e.employee_name ? `Salary for ${e.employee_name}` : "—")}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => setViewEntry({ type: e._isSalary ? "finance" : "expense", data: e })}
                                    title="View"
                                  >
                                    <Eye size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {renderPagination()}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="section-title" style={{ marginBottom: 8 }}>Transactional Panel</p>
                <p className="section-title" style={{ marginBottom: 12 }}>{currentDeptLabel} Finance Entries</p>
                <FinanceTable
                  entries={deptEntries}
                  onView={(entry) => setViewEntry({ type: "finance", data: entry })}
                />
                {renderPagination()}
              </div>
            )}
          </>
        )}
      </main>

      {viewEntry && (
        <EntryViewModal
          entry={viewEntry.data}
          type={viewEntry.type}
          onClose={() => setViewEntry(null)}
        />
      )}
    </div>
  );
}