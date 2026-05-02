const router = require("express").Router();
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLog");

router.use(authenticateToken);
router.use(requireRole("MENTOR", "ADMIN", "TEAM_LEAD"));

const ALLOWED_STATUSES = ["PENDING", "APPROVED", "PAID"];

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTextOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function deriveFinalVendor(payload) {
  const vendors = [
    { label: "Vendor 1", name: payload.vendor1Name, amount: toNumberOrNull(payload.vendor1Amount) },
    { label: "Vendor 2", name: payload.vendor2Name, amount: toNumberOrNull(payload.vendor2Amount) },
    { label: "Vendor 3", name: payload.vendor3Name, amount: toNumberOrNull(payload.vendor3Amount) },
  ].filter((vendor) => vendor.amount !== null);

  if (!vendors.length) {
    return {
      finalVendorDetails: toTextOrNull(payload.finalVendorDetails),
      finalAmount: toNumberOrNull(payload.finalAmount),
    };
  }

  const lowestVendor = vendors.reduce((winner, vendor) => (vendor.amount < winner.amount ? vendor : winner));

  return {
    finalVendorDetails:
      payload.finalVendorDetails !== undefined && payload.finalVendorDetails !== null && payload.finalVendorDetails !== ""
        ? toTextOrNull(payload.finalVendorDetails)
        : lowestVendor.name
          ? `${lowestVendor.label} - ${lowestVendor.name}`
          : lowestVendor.label,
    finalAmount:
      payload.finalAmount !== undefined && payload.finalAmount !== null && payload.finalAmount !== ""
        ? toNumberOrNull(payload.finalAmount)
        : lowestVendor.amount,
  };
}

function normalizeBudgetEntry(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    itemName: row.item_name || "",
    qty: row.qty === null || row.qty === undefined ? "" : Number(row.qty),
    vendor1Name: row.vendor1_name || "",
    vendor1Amount: row.vendor1_amount === null || row.vendor1_amount === undefined ? "" : Number(row.vendor1_amount),
    vendor2Name: row.vendor2_name || "",
    vendor2Amount: row.vendor2_amount === null || row.vendor2_amount === undefined ? "" : Number(row.vendor2_amount),
    vendor3Name: row.vendor3_name || "",
    vendor3Amount: row.vendor3_amount === null || row.vendor3_amount === undefined ? "" : Number(row.vendor3_amount),
    finalVendorDetails: row.final_vendor_details || "",
    finalAmount: row.final_amount === null || row.final_amount === undefined ? "" : Number(row.final_amount),
    remarks: row.remarks || "",
    poNumber: row.po_number || "",
    utr: row.utr || "",
    transactionDate: row.transaction_date || "",
    transactionAmount: row.transaction_amount === null || row.transaction_amount === undefined ? "" : Number(row.transaction_amount),
    invoice: row.invoice || "",
    status: row.status || "PENDING",
    invoiceQty: row.invoice_qty === null || row.invoice_qty === undefined ? "" : Number(row.invoice_qty),
    invoiceDate: row.invoice_date || "",
    certifiedBy: row.certified_by || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildEntryPayload(body) {
  const autoFinal = deriveFinalVendor(body);

  return [
    toTextOrNull(body.itemName),
    toNumberOrNull(body.qty),
    toTextOrNull(body.vendor1Name),
    toNumberOrNull(body.vendor1Amount),
    toTextOrNull(body.vendor2Name),
    toNumberOrNull(body.vendor2Amount),
    toTextOrNull(body.vendor3Name),
    toNumberOrNull(body.vendor3Amount),
    autoFinal.finalVendorDetails,
    autoFinal.finalAmount,
    toTextOrNull(body.remarks),
    toTextOrNull(body.poNumber),
    toTextOrNull(body.utr),
    toTextOrNull(body.transactionDate),
    toNumberOrNull(body.transactionAmount),
    toTextOrNull(body.invoice),
    ALLOWED_STATUSES.includes(body.status) ? body.status : "PENDING",
    toNumberOrNull(body.invoiceQty),
    toTextOrNull(body.invoiceDate),
    toTextOrNull(body.certifiedBy),
  ];
}

router.get("/:projectId/summary", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) AS total_rows,
         COALESCE(SUM(COALESCE(transaction_amount, final_amount, 0)), 0) AS total_amount,
         COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN COALESCE(transaction_amount, final_amount, 0) ELSE 0 END), 0) AS approved_amount,
         COALESCE(SUM(CASE WHEN status = 'PAID' THEN COALESCE(transaction_amount, final_amount, 0) ELSE 0 END), 0) AS paid_amount,
         COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_count,
         COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approved_count,
         COALESCE(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END), 0) AS paid_count
       FROM budget_entries
       WHERE project_id = $1`,
      [Number(req.params.projectId)]
    );

    return res.json({
      totalRows: Number(result.rows[0]?.total_rows || 0),
      totalAmount: Number(result.rows[0]?.total_amount || 0),
      approvedAmount: Number(result.rows[0]?.approved_amount || 0),
      paidAmount: Number(result.rows[0]?.paid_amount || 0),
      pendingCount: Number(result.rows[0]?.pending_count || 0),
      approvedCount: Number(result.rows[0]?.approved_count || 0),
      paidCount: Number(result.rows[0]?.paid_count || 0),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch budget summary." });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              project_id,
              item_name,
              qty,
              vendor1_name,
              vendor1_amount,
              vendor2_name,
              vendor2_amount,
              vendor3_name,
              vendor3_amount,
              final_vendor_details,
              final_amount,
              remarks,
              po_number,
              utr,
              transaction_date,
              transaction_amount,
              invoice,
              status,
              invoice_qty,
              invoice_date,
              certified_by,
              created_at,
              updated_at
       FROM budget_entries
       WHERE project_id = $1
       ORDER BY id ASC`,
      [Number(req.params.projectId)]
    );

    res.json(result.rows.map(normalizeBudgetEntry));
  } catch {
    res.status(500).json({ message: "Failed to fetch budget entries." });
  }
});

router.post("/:projectId", requireRole("ADMIN", "TEAM_LEAD"), async (req, res) => {
  const projectId = Number(req.params.projectId);
  const payload = buildEntryPayload(req.body || {});

  try {
    const result = await pool.query(
      `INSERT INTO budget_entries (
         project_id,
         item_name,
         qty,
         vendor1_name,
         vendor1_amount,
         vendor2_name,
         vendor2_amount,
         vendor3_name,
         vendor3_amount,
         final_vendor_details,
         final_amount,
         remarks,
         po_number,
         utr,
         transaction_date,
         transaction_amount,
         invoice,
         status,
         invoice_qty,
         invoice_date,
         certified_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
       )
       RETURNING *`,
      [projectId, ...payload]
    );

    const created = normalizeBudgetEntry(result.rows[0]);

    await logActivity({
      userName: req.user.name,
      action: `Added budget row: ${created.itemName || "Untitled"}`,
      projectId: created.projectId,
    });

    res.status(201).json(created);
  } catch {
    res.status(500).json({ message: "Failed to create budget entry." });
  }
});

router.put("/:id", requireRole("ADMIN", "TEAM_LEAD"), async (req, res) => {
  const payload = buildEntryPayload(req.body || {});

  try {
    const result = await pool.query(
      `UPDATE budget_entries
       SET item_name = $1,
           qty = $2,
           vendor1_name = $3,
           vendor1_amount = $4,
           vendor2_name = $5,
           vendor2_amount = $6,
           vendor3_name = $7,
           vendor3_amount = $8,
           final_vendor_details = $9,
           final_amount = $10,
           remarks = $11,
           po_number = $12,
           utr = $13,
           transaction_date = $14,
           transaction_amount = $15,
           invoice = $16,
           status = $17,
           invoice_qty = $18,
           invoice_date = $19,
           certified_by = $20,
           updated_at = NOW()
       WHERE id = $21
       RETURNING *`,
      [...payload, Number(req.params.id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Budget entry not found." });
    }

    const updated = normalizeBudgetEntry(result.rows[0]);

    await logActivity({
      userName: req.user.name,
      action: `Updated budget row status to ${updated.status}`,
      projectId: updated.projectId,
    });

    return res.json(updated);
  } catch {
    return res.status(500).json({ message: "Failed to update budget status." });
  }
});

router.delete("/:id", requireRole("ADMIN", "TEAM_LEAD"), async (req, res) => {
  try {
    const existing = await pool.query(
      `SELECT id, project_id AS "projectId", item_name AS "itemName" FROM budget_entries WHERE id = $1`,
      [Number(req.params.id)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Budget entry not found." });
    }

    const result = await pool.query(`DELETE FROM budget_entries WHERE id = $1 RETURNING id`, [Number(req.params.id)]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Budget entry not found." });
    }

    await logActivity({
      userName: req.user.name,
      action: `Deleted budget row: ${existing.rows[0].itemName || "Untitled"}`,
      projectId: existing.rows[0].projectId,
    });

    return res.json({ message: "Budget entry deleted successfully." });
  } catch {
    return res.status(500).json({ message: "Failed to delete budget entry." });
  }
});

module.exports = router;
