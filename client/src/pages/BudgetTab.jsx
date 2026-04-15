import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import api from "../services/api";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "PAID"];

const EMPTY_ROW = {
  itemName: "",
  qty: "",
  vendor1Name: "",
  vendor1Amount: "",
  vendor2Name: "",
  vendor2Amount: "",
  vendor3Name: "",
  vendor3Amount: "",
  finalVendorDetails: "",
  finalAmount: "",
  remarks: "",
  poNumber: "",
  utr: "",
  transactionDate: "",
  transactionAmount: "",
  invoice: "",
  status: "PENDING",
  invoiceQty: "",
  invoiceDate: "",
  certifiedBy: "",
};

function createDraftRow() {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    isDraft: true,
    ...EMPTY_ROW,
  };
}

function normalizeRow(row) {
  return {
    id: row.id,
    isDraft: false,
    itemName: row.itemName || "",
    qty: row.qty === null || row.qty === undefined ? "" : String(row.qty),
    vendor1Name: row.vendor1Name || "",
    vendor1Amount: row.vendor1Amount === null || row.vendor1Amount === undefined ? "" : String(row.vendor1Amount),
    vendor2Name: row.vendor2Name || "",
    vendor2Amount: row.vendor2Amount === null || row.vendor2Amount === undefined ? "" : String(row.vendor2Amount),
    vendor3Name: row.vendor3Name || "",
    vendor3Amount: row.vendor3Amount === null || row.vendor3Amount === undefined ? "" : String(row.vendor3Amount),
    finalVendorDetails: row.finalVendorDetails || "",
    finalAmount: row.finalAmount === null || row.finalAmount === undefined ? "" : String(row.finalAmount),
    remarks: row.remarks || "",
    poNumber: row.poNumber || "",
    utr: row.utr || "",
    transactionDate: row.transactionDate || "",
    transactionAmount: row.transactionAmount === null || row.transactionAmount === undefined ? "" : String(row.transactionAmount),
    invoice: row.invoice || "",
    status: row.status || "PENDING",
    invoiceQty: row.invoiceQty === null || row.invoiceQty === undefined ? "" : String(row.invoiceQty),
    invoiceDate: row.invoiceDate || "",
    certifiedBy: row.certifiedBy || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTextOrNull(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function deriveFinalVendor(row) {
  const vendors = [
    { label: "Vendor 1", name: row.vendor1Name, amount: toNumberOrNull(row.vendor1Amount) },
    { label: "Vendor 2", name: row.vendor2Name, amount: toNumberOrNull(row.vendor2Amount) },
    { label: "Vendor 3", name: row.vendor3Name, amount: toNumberOrNull(row.vendor3Amount) },
  ].filter((vendor) => vendor.amount !== null);

  if (!vendors.length) {
    return {
      finalVendorDetails: toTextOrNull(row.finalVendorDetails),
      finalAmount: toNumberOrNull(row.finalAmount),
    };
  }

  const lowest = vendors.reduce((winner, vendor) => (vendor.amount < winner.amount ? vendor : winner));

  return {
    finalVendorDetails: lowest.name ? `${lowest.label} - ${lowest.name}` : lowest.label,
    finalAmount: lowest.amount,
  };
}

function toApiPayload(row, overrides = {}) {
  const nextRow = { ...row, ...overrides };
  const derived = deriveFinalVendor(nextRow);

  return {
    itemName: toTextOrNull(nextRow.itemName),
    qty: toNumberOrNull(nextRow.qty),
    vendor1Name: toTextOrNull(nextRow.vendor1Name),
    vendor1Amount: toNumberOrNull(nextRow.vendor1Amount),
    vendor2Name: toTextOrNull(nextRow.vendor2Name),
    vendor2Amount: toNumberOrNull(nextRow.vendor2Amount),
    vendor3Name: toTextOrNull(nextRow.vendor3Name),
    vendor3Amount: toNumberOrNull(nextRow.vendor3Amount),
    finalVendorDetails: toTextOrNull(nextRow.finalVendorDetails) || derived.finalVendorDetails,
    finalAmount: toNumberOrNull(nextRow.finalAmount) ?? derived.finalAmount,
    remarks: toTextOrNull(nextRow.remarks),
    poNumber: toTextOrNull(nextRow.poNumber),
    utr: toTextOrNull(nextRow.utr),
    transactionDate: toTextOrNull(nextRow.transactionDate),
    transactionAmount: toNumberOrNull(nextRow.transactionAmount),
    invoice: toTextOrNull(nextRow.invoice),
    status: STATUS_OPTIONS.includes(nextRow.status) ? nextRow.status : "PENDING",
    invoiceQty: toNumberOrNull(nextRow.invoiceQty),
    invoiceDate: toTextOrNull(nextRow.invoiceDate),
    certifiedBy: toTextOrNull(nextRow.certifiedBy),
  };
}

function formatCurrency(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "₹0";
  }

  return `₹${parsed.toLocaleString("en-IN")}`;
}

export default function BudgetTab({ projectId, currentUserRole, projectAccent = "from-cyan-700 to-teal-500" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRowIds, setSavingRowIds] = useState([]);
  const [selectedCell, setSelectedCell] = useState({ rowId: null, field: null });
  const [message, setMessage] = useState("");
  const itemsRef = useRef([]);
  const cellRefs = useRef({});

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    fetchBudgetData();
  }, [projectId]);

  const summary = useMemo(() => {
    const rows = items.filter((row) => !row.isDraft);
    const totalRows = rows.length;
    const totalAmount = rows.reduce((sum, row) => sum + (Number(row.transactionAmount) || Number(row.finalAmount) || 0), 0);
    const approvedCount = rows.filter((row) => row.status === "APPROVED").length;
    const paidCount = rows.filter((row) => row.status === "PAID").length;
    const pendingCount = rows.filter((row) => row.status === "PENDING").length;

    return { totalRows, totalAmount, approvedCount, paidCount, pendingCount };
  }, [items]);

  async function fetchBudgetData() {
    setLoading(true);
    setMessage("");

    try {
      const response = await api.get(`/budgets/${projectId}`);
      const rows = Array.isArray(response.data) ? response.data.map(normalizeRow) : [];
      setItems(rows.length > 0 ? rows : [createDraftRow()]);
    } catch (error) {
      console.error("Failed to fetch budget data", error);
      setItems([createDraftRow()]);
      setMessage("Working offline for now. Start the backend to sync rows.");
    } finally {
      setLoading(false);
    }
  }

  function updateRowInState(rowId, updater) {
    setItems((prev) => prev.map((row) => (row.id === rowId ? updater(row) : row)));
  }

  function registerCellRef(rowId, field, element) {
    if (!cellRefs.current[rowId]) {
      cellRefs.current[rowId] = {};
    }

    cellRefs.current[rowId][field] = element;
  }

  function focusCell(rowId, field) {
    const element = cellRefs.current[rowId]?.[field];
    if (element) {
      element.focus();
      if (typeof element.select === "function") {
        element.select();
      }
    }
  }

  async function persistRow(rowId, options = { overrides: {} }) {
    const row = itemsRef.current.find((entry) => entry.id === rowId);

    if (!row) {
      return;
    }

    const payload = toApiPayload(row, options.overrides || {});
    const markSaving = (isSaving) =>
      setSavingRowIds((prev) => (isSaving ? [...new Set([...prev, rowId])] : prev.filter((id) => id !== rowId)));

    markSaving(true);

    try {
      if (row.isDraft) {
        const response = await api.post(`/budgets/${projectId}`, payload);
        const normalized = normalizeRow(response.data);
        setItems((prev) => prev.map((entry) => (entry.id === rowId ? normalized : entry)));
      } else {
        const response = await api.put(`/budgets/${rowId}`, payload);
        const normalized = normalizeRow(response.data);
        setItems((prev) => prev.map((entry) => (entry.id === rowId ? normalized : entry)));
      }

      setMessage("Saved.");
      window.clearTimeout(window.__budgetMessageTimer);
      window.__budgetMessageTimer = window.setTimeout(() => setMessage(""), 1200);
    } catch (error) {
      console.error("Failed to save budget row", error);
      setMessage("Save failed. Check backend and try again.");
    } finally {
      markSaving(false);
    }
  }

  function handleCellChange(rowId, field, value) {
    updateRowInState(rowId, (row) => ({ ...row, [field]: value }));
  }

  function handleCellBlur(rowId, field) {
    if (field === "status") {
      return;
    }

    persistRow(rowId);
  }

  function handleCellKeyDown(event, rowIndex, field) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const nextRow = items[rowIndex + 1];
    if (nextRow) {
      focusCell(nextRow.id, field);
      return;
    }

    addDraftRow(field);
  }

  function addDraftRow(focusField = "itemName") {
    const draftRow = createDraftRow();
    setItems((prev) => [...prev, draftRow]);
    window.setTimeout(() => focusCell(draftRow.id, focusField), 0);
  }

  async function deleteRow(rowId) {
    const row = itemsRef.current.find((entry) => entry.id === rowId);

    if (!row) {
      return;
    }

    if (row.isDraft) {
      setItems((prev) => prev.filter((entry) => entry.id !== rowId));
      return;
    }

    if (!window.confirm("Delete this budget row?")) {
      return;
    }

    try {
      await api.delete(`/budgets/${rowId}`);
      setItems((prev) => prev.filter((entry) => entry.id !== rowId));
      setMessage("Row deleted.");
      window.setTimeout(() => setMessage(""), 1200);
    } catch (error) {
      console.error("Failed to delete budget row", error);
      alert("Failed to delete budget row.");
    }
  }

  function autoFillAllRows() {
    setItems((prev) =>
      prev.map((row) => {
        if (row.isDraft) {
          return row;
        }

        return {
          ...row,
          ...deriveFinalVendor(row),
        };
      })
    );

    itemsRef.current.forEach((row) => {
      if (!row.isDraft) {
        persistRow(row.id, { autoVendor: true });
      }
    });
  }

  function isSaving(rowId) {
    return savingRowIds.includes(rowId);
  }

  const renderInput = (row, rowIndex, field, type = "text", extraClasses = "") => (
    <input
      ref={(element) => registerCellRef(row.id, field, element)}
      type={type}
      value={row[field]}
      onFocus={() => setSelectedCell({ rowId: row.id, field })}
      onChange={(event) => handleCellChange(row.id, field, event.target.value)}
      onBlur={() => handleCellBlur(row.id, field)}
      onKeyDown={(event) => handleCellKeyDown(event, rowIndex, field)}
      className={`w-full border-0 bg-transparent px-2 py-2 text-sm outline-none focus:bg-blue-50 ${extraClasses}`}
    />
  );

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const exportData = items
      .filter((row) => !row.isDraft)
      .map((row, index) => ({
        "Sl No": index + 1,
        "Item Description": row.itemName || "",
        "Qty": row.qty || "",
        "Vendor 1 - Name": row.vendor1Name || "",
        "Vendor 1 - Amount": row.vendor1Amount || "",
        "Vendor 2 - Name": row.vendor2Name || "",
        "Vendor 2 - Amount": row.vendor2Amount || "",
        "Vendor 3 - Name": row.vendor3Name || "",
        "Vendor 3 - Amount": row.vendor3Amount || "",
        "Selected Vendor": row.finalVendorDetails || "",
        "Final Amount": row.finalAmount || "",
        "Remarks": row.remarks || "",
        "PO Number": row.poNumber || "",
        "UTR": row.utr || "",
        "Transaction Date": row.transactionDate || "",
        "Transaction Amount": row.transactionAmount || "",
        "Invoice": row.invoice || "",
        "Status": row.status || "PENDING",
        "Invoice Qty": row.invoiceQty || "",
        "Invoice Date": row.invoiceDate || "",
        "Certified By": row.certifiedBy || "",
      }));

    if (exportData.length === 0) {
      setMessage("No data to export. Add items first.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const colWidths = [
      { wch: 6 },
      { wch: 24 },
      { wch: 8 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
    ];
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Budget");

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Budget-Export-${timestamp}.xlsx`);
    setMessage("Budget exported to Excel successfully!");
    window.setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className={`bg-gradient-to-r ${projectAccent} px-6 py-6 text-white sm:px-8`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Budget control</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Excel-Level Budget Module</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
            Spreadsheet-style vendor comparison, final selection, transactions, and invoice tracking.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addDraftRow()}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-50"
          >
            + Add Row
          </button>
          <button
            type="button"
            onClick={autoFillAllRows}
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Auto Fill Final Vendor
          </button>
          <button
            type="button"
            onClick={exportToExcel}
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500/30"
          >
            Download Excel
          </button>
          <button
            type="button"
            onClick={fetchBudgetData}
            className="rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>
        </div>

        <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 md:grid-cols-4 sm:px-8">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rows</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.totalRows}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Amount</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(summary.totalAmount)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Approved / Paid</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary.approvedCount} / {summary.paidCount}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.pendingCount}</p>
          </article>
        </div>
      </div>

      {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

      {loading ? (
        <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          Loading spreadsheet...
        </div>
      ) : (
        <div className="overflow-auto rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <table id="budgetstructure" className="min-w-[2400px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-blue-100 text-center text-slate-900">
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Sl No</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Item Description</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Qty</th>
                <th colSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Vendor 1</th>
                <th colSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Vendor 2</th>
                <th colSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Vendor 3</th>
                <th colSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Final Vendor</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Remarks</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">PO Number</th>
                <th colSpan="3" className="border border-slate-200 px-3 py-3 font-semibold">Transaction Details</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Invoice</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Status</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Qty</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Date</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Certified By</th>
                <th rowSpan="2" className="border border-slate-200 px-3 py-3 font-semibold">Actions</th>
              </tr>
              <tr className="bg-blue-50 text-center text-slate-700">
                <th className="border border-slate-200 px-3 py-2 font-medium">Name</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">Amount</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">Name</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">Amount</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">Name</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">Amount</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">Details</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">Amount</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">UTR</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">Date</th>
                <th className="border border-slate-200 px-3 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, rowIndex) => {
                const cellClass = (field) =>
                  `border border-slate-200 align-top ${
                    selectedCell.rowId === row.id && selectedCell.field === field ? "bg-blue-50" : ""
                  }`;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="border border-slate-200 px-3 py-2 text-center text-slate-500">{rowIndex + 1}</td>
                    <td className={cellClass("itemName")}>{renderInput(row, rowIndex, "itemName")}</td>
                    <td className={cellClass("qty")}>{renderInput(row, rowIndex, "qty", "number")}</td>
                    <td className={cellClass("vendor1Name")}>{renderInput(row, rowIndex, "vendor1Name")}</td>
                    <td className={cellClass("vendor1Amount")}>{renderInput(row, rowIndex, "vendor1Amount", "number")}</td>
                    <td className={cellClass("vendor2Name")}>{renderInput(row, rowIndex, "vendor2Name")}</td>
                    <td className={cellClass("vendor2Amount")}>{renderInput(row, rowIndex, "vendor2Amount", "number")}</td>
                    <td className={cellClass("vendor3Name")}>{renderInput(row, rowIndex, "vendor3Name")}</td>
                    <td className={cellClass("vendor3Amount")}>{renderInput(row, rowIndex, "vendor3Amount", "number")}</td>
                    <td className={cellClass("finalVendorDetails")}>{renderInput(row, rowIndex, "finalVendorDetails")}</td>
                    <td className={cellClass("finalAmount")}>{renderInput(row, rowIndex, "finalAmount", "number")}</td>
                    <td className={cellClass("remarks")}>{renderInput(row, rowIndex, "remarks")}</td>
                    <td className={cellClass("poNumber")}>{renderInput(row, rowIndex, "poNumber")}</td>
                    <td className={cellClass("utr")}>{renderInput(row, rowIndex, "utr")}</td>
                    <td className={cellClass("transactionDate")}>{renderInput(row, rowIndex, "transactionDate", "date")}</td>
                    <td className={cellClass("transactionAmount")}>{renderInput(row, rowIndex, "transactionAmount", "number")}</td>
                    <td className={cellClass("invoice")}>{renderInput(row, rowIndex, "invoice")}</td>
                    <td className={cellClass("status")}> 
                      <select
                        ref={(element) => registerCellRef(row.id, "status", element)}
                        value={row.status}
                        disabled={currentUserRole !== "MENTOR"}
                        onFocus={() => setSelectedCell({ rowId: row.id, field: "status" })}
                        onChange={(event) => {
                          handleCellChange(row.id, "status", event.target.value);
                          persistRow(row.id, { overrides: { status: event.target.value } });
                        }}
                        onBlur={() => handleCellBlur(row.id, "status")}
                        onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "status")}
                        className="w-full border-0 bg-transparent px-2 py-2 text-sm outline-none focus:bg-blue-50"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={cellClass("invoiceQty")}>{renderInput(row, rowIndex, "invoiceQty", "number")}</td>
                    <td className={cellClass("invoiceDate")}>{renderInput(row, rowIndex, "invoiceDate", "date")}</td>
                    <td className={cellClass("certifiedBy")}>{renderInput(row, rowIndex, "certifiedBy")}</td>
                    <td className="border border-slate-200 px-3 py-2 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => persistRow(row.id, { autoVendor: true })}
                          className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Save
                        </button>
                        {currentUserRole === "MENTOR" && (
                          <button
                            type="button"
                            onClick={() => deleteRow(row.id)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Delete
                          </button>
                        )}
                        {isSaving(row.id) && <span className="text-xs text-slate-400">Saving...</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Excel behavior: use Tab to move across inputs, Enter to jump to the next row, and every cell saves on blur.
      </div>

      {currentUserRole !== "MENTOR" && (
        <div className="text-xs text-slate-500">
          Students can edit cells, while mentors can approve and manage spreadsheet rows.
        </div>
      )}
    </div>
  );
}
