import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import api from "../services/api";
import InfoTip from "../components/InfoTip";
import { getApiErrorMessage } from "../services/apiError";
import Card from "../components/ui/Card";
import { canEditBudget } from "../utils/roles";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "PAID"];
const ROW_SIZE_OPTIONS = [
  { value: "compact", label: "Compact", rowHeight: 36, cellPadding: "py-1.5" },
  { value: "normal", label: "Normal", rowHeight: 46, cellPadding: "py-2" },
  { value: "spacious", label: "Spacious", rowHeight: 58, cellPadding: "py-3" },
];
const ROW_MIN_HEIGHT = 34;
const COLUMN_MIN_WIDTH = 72;
const DEFAULT_COLUMN_WIDTHS = [
  72, 240, 80,
  170, 120,
  170, 120,
  170, 120,
  220, 130,
  150, 130,
  130, 140, 140,
  130, 120,
  90, 120, 140,
  130,
];
const CELL_FIELDS = [
  "itemName",
  "qty",
  "vendor1Name",
  "vendor1Amount",
  "vendor2Name",
  "vendor2Amount",
  "vendor3Name",
  "vendor3Amount",
  "finalVendorDetails",
  "finalAmount",
  "remarks",
  "poNumber",
  "utr",
  "transactionDate",
  "transactionAmount",
  "invoice",
  "status",
  "invoiceQty",
  "invoiceDate",
  "certifiedBy",
];

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

export default function BudgetTab({ projectId, currentUserRole }) {
  const canManageBudget = canEditBudget(currentUserRole);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTableFullScreen, setIsTableFullScreen] = useState(false);
  const [rowHeights, setRowHeights] = useState({});
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [savingRowIds, setSavingRowIds] = useState([]);
  const [selectedCell, setSelectedCell] = useState({ rowId: null, field: null });
  const [message, setMessage] = useState("");
  const itemsRef = useRef([]);
  const cellRefs = useRef({});
  const rowResizeRef = useRef(null);
  const colResizeRef = useRef(null);

  const rowSizeConfig = ROW_SIZE_OPTIONS[1];

  function getRowHeight(rowId) {
    return rowHeights[rowId] || rowSizeConfig.rowHeight;
  }

  function startRowResize(event, rowId) {
    event.preventDefault();
    event.stopPropagation();

    rowResizeRef.current = {
      rowId,
      startY: event.clientY,
      startHeight: getRowHeight(rowId),
    };

    const handlePointerMove = (moveEvent) => {
      const activeResize = rowResizeRef.current;
      if (!activeResize || activeResize.rowId !== rowId) {
        return;
      }

      const nextHeight = Math.max(ROW_MIN_HEIGHT, activeResize.startHeight + (moveEvent.clientY - activeResize.startY));
      setRowHeights((prev) => ({ ...prev, [rowId]: nextHeight }));
    };

    const handlePointerUp = () => {
      rowResizeRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function startColumnResize(event, columnIndex) {
    event.preventDefault();
    event.stopPropagation();

    colResizeRef.current = {
      columnIndex,
      startX: event.clientX,
      startWidth: columnWidths[columnIndex] || DEFAULT_COLUMN_WIDTHS[columnIndex] || COLUMN_MIN_WIDTH,
    };

    const handlePointerMove = (moveEvent) => {
      const activeResize = colResizeRef.current;
      if (!activeResize || activeResize.columnIndex !== columnIndex) {
        return;
      }

      const nextWidth = Math.max(COLUMN_MIN_WIDTH, activeResize.startWidth + (moveEvent.clientX - activeResize.startX));
      setColumnWidths((prev) => {
        const next = [...prev];
        next[columnIndex] = nextWidth;
        return next;
      });
    };

    const handlePointerUp = () => {
      colResizeRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  const renderColumnResizeHandle = (columnIndex) => (
    <button
      type="button"
      aria-label="Resize column"
      title="Drag column border to resize"
      onPointerDown={(event) => startColumnResize(event, columnIndex)}
      className="group absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize border-0 bg-transparent p-0"
    >
      <span className="absolute left-1/2 top-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-300 transition group-hover:bg-sky-500" />
    </button>
  );

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    fetchBudgetData();
  }, [projectId]);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setIsTableFullScreen(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  useEffect(() => {
    if (!isTableFullScreen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isTableFullScreen]);

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
      setMessage("");
    } catch (error) {
      setItems([createDraftRow()]);
      setMessage(getApiErrorMessage(error, "Working offline for now. Start the backend to sync rows."));
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

  function focusByGridPosition(rowIndex, columnIndex) {
    const boundedColumn = Math.max(0, Math.min(CELL_FIELDS.length - 1, columnIndex));
    const row = items[rowIndex];

    if (!row) {
      return;
    }

    focusCell(row.id, CELL_FIELDS[boundedColumn]);
  }

  async function persistRow(rowId, options = { overrides: {} }) {
    if (!canManageBudget) {
      return;
    }

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
      setMessage(getApiErrorMessage(error, "Save failed. Check backend and try again."));
    } finally {
      markSaving(false);
    }
  }

  function handleCellChange(rowId, field, value) {
    updateRowInState(rowId, (row) => ({ ...row, [field]: value }));
  }

  function handleCellBlur(rowId, field) {
    if (!canManageBudget) {
      return;
    }

    if (field === "status") {
      return;
    }

    persistRow(rowId);
  }

  function handleCellKeyDown(event, rowIndex, field) {
    const columnIndex = CELL_FIELDS.indexOf(field);

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusByGridPosition(rowIndex, columnIndex + 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusByGridPosition(rowIndex, columnIndex - 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusByGridPosition(Math.max(0, rowIndex - 1), columnIndex);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = Math.min(items.length - 1, rowIndex + 1);
      focusByGridPosition(nextIndex, columnIndex);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const nextRow = items[rowIndex + 1];
      if (nextRow) {
        focusCell(nextRow.id, field);
        return;
      }

      addDraftRow(field);
    }
  }

  function addDraftRow(focusField = "itemName") {
    const draftRow = createDraftRow();
    setItems((prev) => [...prev, draftRow]);
    window.setTimeout(() => focusCell(draftRow.id, focusField), 0);
  }

  async function deleteRow(rowId) {
    if (!canManageBudget) {
      return;
    }

    const row = itemsRef.current.find((entry) => entry.id === rowId);

    if (!row) {
      return;
    }

    if (row.isDraft) {
      setItems((prev) => prev.filter((entry) => entry.id !== rowId));
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
    if (!canManageBudget) {
      return;
    }

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
      disabled={!canManageBudget}
      onFocus={() => setSelectedCell({ rowId: row.id, field })}
      onChange={(event) => handleCellChange(row.id, field, event.target.value)}
      onBlur={() => handleCellBlur(row.id, field)}
      onKeyDown={(event) => handleCellKeyDown(event, rowIndex, field)}
      className={`w-full border-0 bg-transparent px-2 text-sm outline-none focus:bg-white/90 ${rowSizeConfig.cellPadding} ${extraClasses}`}
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

  const toggleTableFullScreen = () => {
    setIsTableFullScreen((prev) => !prev);
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[28px] p-0">
        <div className="bg-[linear-gradient(135deg,rgba(37,99,235,0.18)_0%,rgba(14,165,164,0.14)_100%)] px-6 py-6 text-slate-900 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Budget control</p>
          <h2 className="heading-lg heading-project mt-2">Budget Finalization Module</h2>
          <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
            Spreadsheet-style vendor comparison, final selection, transactions, and invoice tracking.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addDraftRow()}
            disabled={!canManageBudget}
            className="glass-button-primary rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            + Add Row
          </button>
          <button
            type="button"
            onClick={autoFillAllRows}
            disabled={!canManageBudget}
            className="glass-button-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            Auto Fill Final Vendor
          </button>
          <button
            type="button"
            onClick={exportToExcel}
            className="glass-button-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            Download Excel
          </button>
          <button
            type="button"
            onClick={toggleTableFullScreen}
            className="glass-button-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            {isTableFullScreen ? "Close Full Screen" : "Full Screen Table"}
          </button>
          <button
            type="button"
            onClick={fetchBudgetData}
            className="glass-button-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>
        </div>

        <div className="grid gap-3 border-t border-white/45 bg-white/35 px-6 py-5 md:grid-cols-4 sm:px-8 backdrop-blur-md">
          <Card className="rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rows</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.totalRows}</p>
          </Card>
          <Card className="rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Amount</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(summary.totalAmount)}</p>
          </Card>
          <Card className="rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Approved / Paid</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary.approvedCount} / {summary.paidCount}
            </p>
          </Card>
          <Card className="rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.pendingCount}</p>
          </Card>
        </div>
      </Card>

      {message && <div className="glass-card rounded-xl px-4 py-3 text-sm text-blue-700">{message}</div>}

      {loading ? (
        <Card className="rounded-[24px] p-8 text-center text-slate-500">
          Loading spreadsheet...
        </Card>
      ) : (
        <div className={isTableFullScreen ? "fixed inset-0 z-[90] bg-slate-100/95 p-3 sm:p-4" : ""}>
          {isTableFullScreen && (
            <>
              <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <p className="text-sm font-semibold text-slate-700">Budget Table - Full App View</p>
                <button
                  type="button"
                  onClick={() => setIsTableFullScreen(false)}
                  className="glass-button-secondary rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex justify-end sm:inset-x-4 sm:bottom-4">
                <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-[0_14px_32px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => addDraftRow()}
                    disabled={!canManageBudget}
                    className="glass-button-primary rounded-2xl px-4 py-2 text-sm font-semibold"
                  >
                    + Add Row
                  </button>
                </div>
              </div>
            </>
          )}
          <Card
            className={`overflow-auto border bg-white/78 p-0 ${
              isTableFullScreen
                ? "h-[calc(100vh-4.5rem)] rounded-2xl border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.12)] hover:translate-y-0"
                : "rounded-[24px] border-white/60 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            }`}
          >
            <table id="budgetstructure" className="border-collapse text-sm bg-white" style={{ minWidth: `${columnWidths.reduce((sum, width) => sum + width, 0)}px` }}>
            <colgroup>
              {columnWidths.map((width, index) => (
                <col key={`col-${index}`} style={{ width: `${width}px` }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-center text-slate-900">
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">Sl No{renderColumnResizeHandle(0)}</th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">Item Description{renderColumnResizeHandle(1)}</th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">Qty{renderColumnResizeHandle(2)}</th>
                <th colSpan="2" className="border border-slate-300 px-3 py-3 font-semibold">Vendor 1</th>
                <th colSpan="2" className="border border-slate-300 px-3 py-3 font-semibold">Vendor 2</th>
                <th colSpan="2" className="border border-slate-300 px-3 py-3 font-semibold">Vendor 3</th>
                <th colSpan="2" className="border border-slate-300 px-3 py-3 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    Final Vendor
                    <InfoTip text="Finalized Vendor is the selected supplier based on best valid quote and approval." />
                  </span>
                </th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">Remarks{renderColumnResizeHandle(11)}</th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">PO Number{renderColumnResizeHandle(12)}</th>
                <th colSpan="3" className="border border-slate-300 px-3 py-3 font-semibold">Transaction Details</th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">Invoice{renderColumnResizeHandle(16)}</th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    Status
                    <InfoTip text="PENDING means awaiting review, APPROVED means validated, PAID means transaction settled." />
                  </span>
                  {renderColumnResizeHandle(17)}
                </th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">Qty{renderColumnResizeHandle(18)}</th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">Date{renderColumnResizeHandle(19)}</th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">Certified By{renderColumnResizeHandle(20)}</th>
                <th rowSpan="2" className="relative border border-slate-300 px-3 py-3 font-semibold">Actions{renderColumnResizeHandle(21)}</th>
              </tr>
              <tr className="bg-slate-50 text-center text-slate-700">
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Name{renderColumnResizeHandle(3)}</th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Amount{renderColumnResizeHandle(4)}</th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Name{renderColumnResizeHandle(5)}</th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Amount{renderColumnResizeHandle(6)}</th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Name{renderColumnResizeHandle(7)}</th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Amount{renderColumnResizeHandle(8)}</th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Details{renderColumnResizeHandle(9)}</th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Amount{renderColumnResizeHandle(10)}</th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    UTR
                    <InfoTip text="Unique Transaction Reference number from the bank transfer record." />
                  </span>
                  {renderColumnResizeHandle(13)}
                </th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Date{renderColumnResizeHandle(14)}</th>
                <th className="relative border border-slate-300 px-3 py-2 font-medium">Amount{renderColumnResizeHandle(15)}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, rowIndex) => {
                const cellClass = (field) =>
                  `border border-slate-300 align-top ${
                    selectedCell.rowId === row.id && selectedCell.field === field ? "bg-blue-50 ring-1 ring-inset ring-blue-300" : "bg-white"
                  }`;

                return (
                  <Fragment key={row.id}>
                  <tr key={row.id} className="hover:bg-white/85" style={{ height: getRowHeight(row.id) }}>
                    <td className={`border border-slate-300 px-3 text-center text-slate-500 bg-slate-50 ${rowSizeConfig.cellPadding}`}>{rowIndex + 1}</td>
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
                        disabled={!canManageBudget}
                        onFocus={() => setSelectedCell({ rowId: row.id, field: "status" })}
                        onChange={(event) => {
                          handleCellChange(row.id, "status", event.target.value);
                          persistRow(row.id, { overrides: { status: event.target.value } });
                        }}
                        onBlur={() => handleCellBlur(row.id, "status")}
                        onKeyDown={(event) => handleCellKeyDown(event, rowIndex, "status")}
                        className="w-full border-0 bg-transparent px-2 py-2 text-sm outline-none focus:bg-white/90"
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
                    <td className={`border border-slate-300 px-3 align-top bg-slate-50 ${rowSizeConfig.cellPadding}`}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => persistRow(row.id, { autoVendor: true })}
                          disabled={!canManageBudget}
                          className="glass-button-primary rounded-md px-2 py-1 text-xs font-medium"
                        >
                          Save
                        </button>
                        {canManageBudget && (
                          <button
                            type="button"
                            onClick={() => deleteRow(row.id)}
                            className="glass-button-secondary rounded-md px-2 py-1 text-xs font-medium"
                          >
                            Delete
                          </button>
                        )}
                        {isSaving(row.id) && <span className="text-xs text-slate-400">Saving...</span>}
                      </div>
                    </td>
                  </tr>
                  <tr key={`${row.id}-resize`} aria-hidden="true">
                    <td colSpan="22" className="relative h-3 p-0">
                      <button
                        type="button"
                        aria-label="Resize row"
                        title="Drag row border to resize"
                        onPointerDown={(event) => startRowResize(event, row.id)}
                        className="group absolute inset-x-0 top-0 h-3 cursor-row-resize border-0 bg-transparent p-0 outline-none"
                      >
                        <span className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-slate-300 transition group-hover:bg-sky-400" />
                        <span className="absolute left-1/2 top-1/2 h-2 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white shadow-sm transition group-hover:border-sky-400 group-hover:bg-sky-50" />
                      </button>
                    </td>
                  </tr>
                  </Fragment>
                );
              })}
            </tbody>
            </table>
          </Card>
        </div>
      )}

      <Card className="rounded-2xl p-4 text-sm text-slate-600">
        Excel behavior: use Tab to move across inputs, Enter to jump to the next row, and every cell saves on blur.
      </Card>

      {!canManageBudget && (
        <div className="text-xs text-slate-500">
          Students can edit cells, while mentors/managers can approve and manage spreadsheet rows.
        </div>
      )}
    </div>
  );
}
