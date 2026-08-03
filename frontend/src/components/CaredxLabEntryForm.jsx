import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  entry_date: today(),
  patient_name: "",
  test_name: "",
  total_amount_paid: "",
  employee_name: "",
  cash: "",
  online: "",
  paid_to_other_labs: "",
  rmp: "",
  salaries_expense: "",
  expense_details: "",
  referral_by: "",
  referral_amount: "",
  sales: "",
});

export default function CaredxLabEntryForm({ open, onClose, onSaved, editingEntry }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingEntry) {
      setForm({
        entry_date: editingEntry.entry_date,
        patient_name: editingEntry.patient_name || "",
        test_name: editingEntry.test_name || "",
        total_amount_paid: editingEntry.total_amount_paid ?? "",
        employee_name: editingEntry.employee_name || "",
        cash: editingEntry.cash ?? "",
        online: editingEntry.online ?? "",
        paid_to_other_labs: editingEntry.paid_to_other_labs ?? "",
        rmp: editingEntry.rmp ?? "",
        salaries_expense: editingEntry.salaries_expense ?? "",
        expense_details: editingEntry.expense_details || "",
        referral_by: editingEntry.referral_by || "",
        referral_amount: editingEntry.referral_amount ?? "",
        sales: editingEntry.sales ?? "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [editingEntry, open]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_name.trim()) {
      toast.error("Please enter the patient's name.");
      return;
    }
    if (!form.test_name.trim()) {
      toast.error("Please enter the test name.");
      return;
    }

    setSaving(true);
    try {
      if (editingEntry) {
        await api.put(`/caredx/lab-entries/${editingEntry.id}`, form);
        toast.success("Lab entry updated.");
      } else {
        await api.post("/caredx/lab-entries", form);
        toast.success("Lab entry added.");
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.errors?.join(" ") || err.response?.data?.message || "Something went wrong.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal--lg">
        <div className="modal-header">
          <h2>{editingEntry ? "Edit Lab Data Entry" : "New Lab Data Entry"}</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Name of the Patient</label>
              <input name="patient_name" value={form.patient_name} onChange={handleChange} placeholder="e.g. K. Likitha" className="form-control" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Name of the Test</label>
            <input name="test_name" value={form.test_name} onChange={handleChange} placeholder="e.g. LFT, WIDAL, CBP" className="form-control" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total Amount Paid (₹)</label>
              <input type="number" step="0.01" min="0" name="total_amount_paid" value={form.total_amount_paid} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Name of the Employee</label>
              <input name="employee_name" value={form.employee_name} onChange={handleChange} placeholder="e.g. Janson Babu" className="form-control" />
            </div>
          </div>

          <hr className="section-divider" />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cash (₹)</label>
              <input type="number" step="0.01" min="0" name="cash" value={form.cash} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Online (₹)</label>
              <input type="number" step="0.01" min="0" name="online" value={form.online} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Paid to Other Labs (₹)</label>
              <input type="number" step="0.01" min="0" name="paid_to_other_labs" value={form.paid_to_other_labs} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">RMP (₹)</label>
              <input type="number" step="0.01" min="0" name="rmp" value={form.rmp} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Salaries/Expense (₹)</label>
              <input type="number" step="0.01" min="0" name="salaries_expense" value={form.salaries_expense} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Sales (₹)</label>
              <input type="number" step="0.01" min="0" name="sales" value={form.sales} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Details of Expenses</label>
            <textarea name="expense_details" value={form.expense_details} onChange={handleChange} rows={2} placeholder="Optional notes about any expense above" className="form-control" />
          </div>

          <hr className="section-divider" />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Referral By (Who)</label>
              <input name="referral_by" value={form.referral_by} onChange={handleChange} placeholder="e.g. Dr. Rao" className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Amount of the Referral (₹)</label>
              <input type="number" step="0.01" min="0" name="referral_amount" value={form.referral_amount} onChange={handleChange} placeholder="0.00" className="form-control" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
