/**
 * Slice 6: per-role visibility filter for the All / Failed Transactions
 * pages. The visibility rule is enforced HERE on the server, not in the
 * React layer (per project_mahakal_txn_visibility memory) — a malicious
 * distributor or retailer must not be able to read fields by hand-crafting
 * a request, even though the React table won't render them.
 *
 *  - admin       : full row, including admin_share_*, distributor_share_*
 *  - distributor : strips admin_share_* (must not see what the admin earns)
 *  - retailer    : strips admin_share_* AND distributor_share_*
 *                  (must not see anything above their own line)
 */

const STRIP_FOR_DISTRIBUTOR = ['admin_share_amount', 'admin_share_pct'];
const STRIP_FOR_RETAILER = [
  'admin_share_amount', 'admin_share_pct',
  'distributor_share_amount', 'distributor_share_pct',
  'distributor_user_id', 'distributor_name', 'distributor_phone',
];

function stripRow(row, fields) {
  const out = { ...row };
  for (const f of fields) delete out[f];
  return out;
}

/**
 * Convert a created_at SQLite string to a millisecond timestamp.
 * The Failed Transactions page wants ms-precision for debugging.
 * SQLite's CURRENT_TIMESTAMP only stores second precision, so this
 * is the seconds × 1000 — fine for ordering / correlation.
 */
function toCreatedAtMs(createdAt) {
  if (!createdAt) return null;
  // SQLite returns 'YYYY-MM-DD HH:MM:SS' (UTC). Treat as UTC.
  const iso = createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T') + 'Z';
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function shapeRows(rows, role) {
  return rows.map((row) => {
    let shaped;
    if (role === 'admin') shaped = { ...row };
    else if (role === 'distributor') shaped = stripRow(row, STRIP_FOR_DISTRIBUTOR);
    else if (role === 'retailer') shaped = stripRow(row, STRIP_FOR_RETAILER);
    else shaped = stripRow(row, STRIP_FOR_RETAILER); // safest default

    shaped.created_at_ms = toCreatedAtMs(row.created_at);
    return shaped;
  });
}

module.exports = { shapeRows, toCreatedAtMs };
