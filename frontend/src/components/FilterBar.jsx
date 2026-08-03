import React from "react";
import { Filter, Download, Plus, RefreshCw } from "lucide-react";

export default function FilterBar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onReset,
  onExport,
  onAddNew,
  searchTerm,
  onSearchChange,
}) {
  return (
    <div className="card filter-bar">
      <div className="form-group">
        <label className="form-label">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label className="form-label">End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="form-control"
        />
      </div>

      {onSearchChange && (
        <div className="form-group form-group--grow">
          <label className="form-label">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by employee or remarks"
            className="form-control"
          />
        </div>
      )}

      <div className="filter-actions">
        <button onClick={onApply} className="btn btn-primary">
          <Filter size={16} /> Apply Filter
        </button>
        <button onClick={onReset} className="btn btn-secondary">
          <RefreshCw size={16} /> Reset
        </button>
        {onExport && (
          <button onClick={onExport} className="btn btn-secondary">
            <Download size={16} /> Export CSV
          </button>
        )}
      </div>

      {onAddNew && (
        <div className="filter-actions filter-actions--push">
          <button onClick={onAddNew} className="btn btn-primary">
            <Plus size={16} /> Add Entry
          </button>
        </div>
      )}
    </div>
  );
}
