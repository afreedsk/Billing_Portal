import React, { useEffect, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

let itemKeyCounter = 0;
const nextItemKey = () => {
  itemKeyCounter += 1;
  return `item-${Date.now()}-${itemKeyCounter}`;
};

const emptyItem = () => ({
  _key: nextItemKey(),
  item_name: "",
  quantity: "1",
  unit_price: "",
});

const formatCurrency = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(number);
};

const apiOrigin = (api.defaults.baseURL || "")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

const invoiceHref = (entry) => {
  if (!entry?.invoice_url) return null;
  if (entry.invoice_url.startsWith("http://") || entry.invoice_url.startsWith("https://")) {
    return entry.invoice_url;
  }
  return `${apiOrigin}${entry.invoice_url}`;
};

export default function FinanceEntryForm({
  open,
  onClose,
  onSaved,
  department,
  options,
  editingEntry,
}) {
  const apiBase = String(department || "").toLowerCase();

  const createEmptyForm = () => ({
    entry_type: "Income",
    category: options?.categories?.Income?.[0] || "",
    sub_category: "",
    generated_by: "",
    revenue_type: options?.revenue_types?.[0] || "",
    patient_name: "",
    patient_place: "",
    client_name: "",
    gst_number: "",
    gst_tax_percent: "",
    tax_invoice_number: "",
    amount: "",
    remarks: "",
    entry_date: today(),
    // Executive Compensation fields
    exec_department: "",
    employee_name: "",
    salary_amount: "",
    allowance_amount: "",
  });

  const [form, setForm] = useState(createEmptyForm());
  const [otherCategory, setOtherCategory] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [removeInvoice, setRemoveInvoice] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !options) return;

    if (editingEntry) {
      const categoryList = options?.categories?.[editingEntry.entry_type] || [];
      const isCustomCategory = categoryList.includes("Others") && !categoryList.includes(editingEntry.category);

      setForm({
        entry_type: editingEntry.entry_type || "Income",
        category: isCustomCategory ? "Others" : editingEntry.category || "",
        sub_category: editingEntry.sub_category || "",
        generated_by: editingEntry.generated_by || "",
        revenue_type: editingEntry.revenue_type || options?.revenue_types?.[0] || "",
        patient_name: editingEntry.patient_name || "",
        patient_place: editingEntry.patient_place || "",
        client_name: editingEntry.client_name || "",
        gst_number: editingEntry.gst_number || "",
        gst_tax_percent: editingEntry.gst_tax_percent !== undefined && editingEntry.gst_tax_percent !== null ? String(editingEntry.gst_tax_percent) : "",
        tax_invoice_number: editingEntry.tax_invoice_number || "",
        amount: editingEntry.amount !== undefined && editingEntry.amount !== null ? String(editingEntry.amount) : "",
        remarks: editingEntry.remarks || "",
        entry_date: editingEntry.entry_date || today(),
        exec_department: editingEntry.exec_department || "",
        employee_name: editingEntry.employee_name || "",
        salary_amount: editingEntry.salary_amount !== undefined && editingEntry.salary_amount !== null ? String(editingEntry.salary_amount) : "",
        allowance_amount: editingEntry.allowance_amount !== undefined && editingEntry.allowance_amount !== null ? String(editingEntry.allowance_amount) : "",
      });

      setOtherCategory(isCustomCategory ? editingEntry.category : "");

      if (Array.isArray(editingEntry.items) && editingEntry.items.length > 0) {
        setItems(editingEntry.items.map((item) => ({
          _key: nextItemKey(),
          item_name: item.item_name || "",
          quantity: String(item.quantity ?? "1"),
          unit_price: String(item.unit_price ?? ""),
        })));
      } else {
        setItems([emptyItem()]);
      }
    } else {
      setForm(createEmptyForm());
      setOtherCategory("");
      setItems([emptyItem()]);
    }

    setInvoiceFile(null);
    setRemoveInvoice(false);
  }, [editingEntry, open, options]);

  if (!open || !options) return null;

  const categoryOptionsForType = options?.categories?.[form.entry_type] || [];
  const revenueTypes = options?.revenue_types || [];
  const gstRequired = (options?.gst_required_categories || []).includes(form.category);
  const isOthersCategory = form.category === "Others";

  // Sub-category for AFU
  const subCategories = options?.sub_categories?.[form.category] || [];
  const showSubCategory = department === "Adminstrationfunctionalunit" && subCategories.length > 0;

  // Executive Compensation for Corporate
  const showExecutiveComp = department === "Corporate" && form.category === "Executive Compensation";

  const handleTypeChange = (event) => {
    const newType = event.target.value;
    const firstCategory = options?.categories?.[newType]?.[0] || "";
    setForm((prev) => ({ ...prev, entry_type: newType, category: firstCategory }));
    setOtherCategory("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, category: value }));
    if (value !== "Others") setOtherCategory("");
  };

  const handleItemChange = (key, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item._key === key ? { ...item, [field]: value } : item))
    );
  };

  const handleAddItem = () => setItems((prev) => [...prev, emptyItem()]);
  const handleRemoveItem = (key) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item._key !== key)));
  };

  const itemsTotal = options?.show_items
    ? items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unit_price) || 0;
        return sum + qty * price;
      }, 0)
    : 0;

  const baseAmount = options?.show_items ? itemsTotal : Number(form.amount) || 0;
  const gstTaxPercentValue = Number(form.gst_tax_percent) || 0;
  const gstTaxAmount = options?.show_gst_tax ? Number(((baseAmount * gstTaxPercentValue) / 100).toFixed(2)) : 0;
  const grandTotal = Number((baseAmount + gstTaxAmount).toFixed(2));

  const handleInvoiceChange = (event) => {
    const file = event.target.files?.[0] || null;
    setInvoiceFile(file);
    setRemoveInvoice(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.entry_date) {
      toast.error("Please select the entry date.");
      return;
    }
    if (!form.category) {
      toast.error("Please select a category.");
      return;
    }
    if (options.show_generated_by && !form.generated_by.trim()) {
      toast.error("Please enter the employee name (Generated By).");
      return;
    }
    if (options.show_patient_fields && !form.patient_name.trim()) {
      toast.error("Please enter the patient name.");
      return;
    }
    if (options.show_gst_number && gstRequired && !form.gst_number.trim()) {
      toast.error(`GST Number is required for ${form.category} entries.`);
      return;
    }
    if (options.show_gst_tax && form.gst_tax_percent) {
      const percent = Number(form.gst_tax_percent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        toast.error("GST Tax must be a number between 0 and 100.");
        return;
      }
    }
    if (isOthersCategory && !otherCategory.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    // Validate sub-category for AFU
    if (showSubCategory && !form.sub_category) {
      toast.error(`Please select a sub-category for "${form.category}".`);
      return;
    }

    let cleanItems = [];
    if (options.show_items) {
      cleanItems = items
        .map((item) => {
          const qty = Number(item.quantity);
          const price = Number(item.unit_price);
          return { item_name: item.item_name.trim(), quantity: qty, unit_price: price };
        })
        .filter((item) => item.item_name);

      if (cleanItems.length === 0) {
        toast.error("Add at least one item.");
        return;
      }
      for (const item of cleanItems) {
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          toast.error(`Enter a valid quantity for "${item.item_name}".`);
          return;
        }
        if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
          toast.error(`Enter a valid unit price for "${item.item_name}".`);
          return;
        }
      }
    } else {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Please enter a valid amount.");
        return;
      }
    }

    setSaving(true);

    try {
      let body;
      let config = {};

      if (options.show_invoice) {
        const formData = new FormData();
        formData.append("entry_type", form.entry_type);
        formData.append("category", form.category);
        if (form.sub_category) formData.append("sub_category", form.sub_category);
        formData.append("entry_date", form.entry_date);
        formData.append("remarks", form.remarks || "");

        if (isOthersCategory) formData.append("other_category", otherCategory.trim());
        if (options.show_generated_by) formData.append("generated_by", form.generated_by.trim());
        if (options.show_revenue_type) formData.append("revenue_type", form.revenue_type || "");
        if (options.show_client_name) formData.append("client_name", form.client_name || "");
        if (options.show_gst_number) formData.append("gst_number", form.gst_number || "");
        if (options.show_gst_tax) formData.append("gst_tax_percent", form.gst_tax_percent || "0");
        if (options.show_tax_invoice_number) formData.append("tax_invoice_number", form.tax_invoice_number || "");
        if (options.show_patient_fields) {
          formData.append("patient_name", form.patient_name || "");
          formData.append("patient_place", form.patient_place || "");
        }
        if (options.show_items) {
          formData.append("items", JSON.stringify(cleanItems));
        } else {
          formData.append("amount", form.amount);
        }

        // Executive compensation fields
        if (showExecutiveComp) {
          if (form.exec_department) formData.append("exec_department", form.exec_department);
          if (form.employee_name) formData.append("employee_name", form.employee_name.trim());
          if (form.salary_amount) formData.append("salary_amount", form.salary_amount);
          if (form.allowance_amount) formData.append("allowance_amount", form.allowance_amount);
        }

        if (invoiceFile) {
          formData.append("invoice", invoiceFile);
        } else if (editingEntry && removeInvoice) {
          formData.append("remove_invoice", "true");
        }

        body = formData;
        config = {};
      } else {
        const payload = { ...form };

        if (isOthersCategory) payload.other_category = otherCategory.trim();

        // Remove fields not applicable
        if (!options.show_generated_by) delete payload.generated_by;
        if (!options.show_revenue_type) delete payload.revenue_type;
        if (!options.show_patient_fields) {
          delete payload.patient_name;
          delete payload.patient_place;
        }
        if (!options.show_client_name) delete payload.client_name;
        if (!options.show_gst_number) delete payload.gst_number;
        if (!options.show_gst_tax) delete payload.gst_tax_percent;
        if (!options.show_tax_invoice_number) delete payload.tax_invoice_number;

        if (options.show_items) {
          payload.items = cleanItems;
          payload.amount = itemsTotal;
        }

        body = payload;
      }

      const url = `/${apiBase}/entries`;
      if (editingEntry) {
        await api.put(`${url}/${editingEntry.id}`, body, config);
        toast.success("Entry updated successfully.");
      } else {
        await api.post(url, body, config);
        toast.success("Entry added successfully.");
      }

      if (typeof onSaved === "function") await onSaved();
      onClose();
    } catch (error) {
      console.error("Finance entry error:", error);
      const errors = error.response?.data?.errors;
      const message = Array.isArray(errors)
        ? errors.join(" ")
        : error.response?.data?.message || "Something went wrong while saving the entry.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{editingEntry ? "Edit Finance Entry" : "New Finance Entry"}</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Department */}
          <div className="form-group">
            <label className="form-label">Department</label>
            <input value={department || ""} disabled className="form-control" />
          </div>

          {/* Type and Category */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select name="entry_type" value={form.entry_type} onChange={handleTypeChange} className="form-control">
                {(options.entry_types || []).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" value={form.category} onChange={handleCategoryChange} className="form-control">
                {categoryOptionsForType.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub-Category for AFU */}
          {showSubCategory && (
            <div className="form-group">
              <label className="form-label">Sub-Category</label>
              <select
                name="sub_category"
                value={form.sub_category || ""}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">Select Sub-Category</option>
                {subCategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}

          {/* Other Category */}
          {isOthersCategory && (
            <div className="form-group">
              <label className="form-label">Other Category Name</label>
              <input value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} placeholder="Enter a category name" className="form-control" />
            </div>
          )}

          {/* Client / GST */}
          {options.show_client_name && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input name="client_name" value={form.client_name} onChange={handleChange} placeholder="Enter the client name" className="form-control" />
              </div>
              {options.show_gst_number && (
                <div className="form-group">
                  <label className="form-label">GST Number {gstRequired ? `(required for ${form.category})` : "(optional)"}</label>
                  <input name="gst_number" value={form.gst_number} onChange={handleChange} placeholder="e.g. 22AAAAA0000A1Z5" className="form-control" />
                </div>
              )}
            </div>
          )}

          {/* GST Tax % / Tax Invoice Number */}
          {(options.show_gst_tax || options.show_tax_invoice_number) && (
            <div className="form-row">
              {options.show_gst_tax && (
                <div className="form-group">
                  <label className="form-label">GST Tax (%)</label>
                  <input type="number" min="0" max="100" step="0.01" name="gst_tax_percent" value={form.gst_tax_percent} onChange={handleChange} placeholder="e.g. 18" className="form-control" />
                </div>
              )}
              {options.show_tax_invoice_number && (
                <div className="form-group">
                  <label className="form-label">Tax Invoice Number</label>
                  <input name="tax_invoice_number" value={form.tax_invoice_number} onChange={handleChange} placeholder="e.g. INV-2026-0142" className="form-control" />
                </div>
              )}
            </div>
          )}

          {/* Patient */}
          {options.show_patient_fields && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input name="patient_name" value={form.patient_name} onChange={handleChange} placeholder="e.g. Ramesh Kumar" className="form-control" />
              </div>
              <div className="form-group">
                <label className="form-label">Patient Place</label>
                <input name="patient_place" value={form.patient_place} onChange={handleChange} placeholder="e.g. Guntur" className="form-control" />
              </div>
            </div>
          )}

          {/* Generated By / Revenue Type */}
          {(options.show_generated_by || options.show_revenue_type) && (
            <div className="form-row">
              {options.show_generated_by && (
                <div className="form-group">
                  <label className="form-label">Generated By</label>
                  <input name="generated_by" value={form.generated_by} onChange={handleChange} placeholder="e.g. John Mathew" className="form-control" />
                </div>
              )}
              {options.show_revenue_type && (
                <div className="form-group">
                  <label className="form-label">Revenue Type</label>
                  <select name="revenue_type" value={form.revenue_type} onChange={handleChange} className="form-control">
                    {revenueTypes.map((rt) => (
                      <option key={rt} value={rt}>{rt}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Executive Compensation fields (Corporate only) */}
          {showExecutiveComp && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Select Department</label>
                  <select name="exec_department" value={form.exec_department || ""} onChange={handleChange} className="form-control">
                    <option value="">Select Department</option>
                    {["IT", "PCM", "MedTech", "Caredx"].map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Employee Name</label>
                  <input name="employee_name" value={form.employee_name || ""} onChange={handleChange} placeholder="Enter employee name" className="form-control" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Salary Amount (₹)</label>
                  <input type="number" step="0.01" min="0" name="salary_amount" value={form.salary_amount || ""} onChange={handleChange} placeholder="0.00" className="form-control" />
                </div>
                <div className="form-group">
                  <label className="form-label">Allowance Amount (₹)</label>
                  <input type="number" step="0.01" min="0" name="allowance_amount" value={form.allowance_amount || ""} onChange={handleChange} placeholder="0.00" className="form-control" />
                </div>
              </div>
            </>
          )}

          {/* Items */}
          {options.show_items ? (
            <div className="form-group">
              <label className="form-label">Items</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((item) => (
                  <div key={item._key} style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px 32px", gap: 8, alignItems: "center" }}>
                    <input value={item.item_name} onChange={(e) => handleItemChange(item._key, "item_name", e.target.value)} placeholder="Item name" className="form-control" />
                    <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(item._key, "quantity", e.target.value)} placeholder="Qty" className="form-control" />
                    <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(item._key, "unit_price", e.target.value)} placeholder="Unit price" className="form-control" />
                    <button type="button" className="btn-icon btn-icon--danger" onClick={() => handleRemoveItem(item._key)} title="Remove item" disabled={items.length === 1}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddItem} className="btn btn-secondary" style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={15} /> Add New Item
              </button>
              <div style={{ marginTop: 12, textAlign: "right" }}>
                {options.show_gst_tax ? (
                  <>
                    <div style={{ fontSize: 13, color: "var(--color-ink-500)" }}>Subtotal: {formatCurrency(baseAmount)}</div>
                    <div style={{ fontSize: 13, color: "var(--color-ink-500)" }}>GST Tax ({gstTaxPercentValue || 0}%): {formatCurrency(gstTaxAmount)}</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>Total Amount: {formatCurrency(grandTotal)}</div>
                  </>
                ) : (
                  <div style={{ fontWeight: 600 }}>Total Amount: {formatCurrency(itemsTotal)}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input type="number" step="0.01" min="0" name="amount" value={form.amount} onChange={handleChange} placeholder="0.00" className="form-control" />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange} className="form-control" />
              </div>
            </div>
          )}

          {!options.show_items && options.show_gst_tax && (
            <p className="text-muted" style={{ textAlign: "right", fontSize: 13, marginTop: -8 }}>
              GST Tax ({gstTaxPercentValue || 0}%): {formatCurrency(gstTaxAmount)}
              {" · "}
              <strong style={{ color: "var(--color-ink-800)" }}>Total: {formatCurrency(grandTotal)}</strong>
            </p>
          )}

          {options.show_items && (
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange} className="form-control" />
            </div>
          )}

          {/* Invoice */}
          {options.show_invoice && (
            <div className="form-group">
              <label className="form-label">Invoice</label>
              {editingEntry && editingEntry.invoice_url && !removeInvoice && (
                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <a href={invoiceHref(editingEntry)} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <FileText size={15} /> <span>View current invoice</span>
                  </a>
                  <button type="button" className="btn-icon btn-icon--danger" onClick={() => setRemoveInvoice(true)} title="Remove invoice">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
              {removeInvoice && <p className="text-muted" style={{ marginBottom: 8, fontSize: 13 }}>Current invoice will be removed when you save.</p>}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx" onChange={handleInvoiceChange} className="form-control" />
              <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Accepted: PDF, JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX.</p>
            </div>
          )}

          {/* Remarks */}
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={3} placeholder="Optional notes about this entry" className="form-control" />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}