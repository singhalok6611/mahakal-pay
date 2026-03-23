import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';

export default function DataTable({ columns, data, totalPages = 1, currentPage = 1, onPageChange, emptyMessage = 'No data found' }) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? data.filter((row) =>
        columns.some((col) => {
          const val = col.accessor ? row[col.accessor] : '';
          return String(val).toLowerCase().includes(search.toLowerCase());
        })
      )
    : data;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="position-relative" style={{ maxWidth: 280 }}>
          <FiSearch className="position-absolute text-muted" style={{ left: 12, top: 11 }} size={16} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: 36, fontSize: '0.95rem' }}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <small className="text-muted">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</small>
      </div>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr className="table-dark">
              {columns.map((col, i) => (
                <th key={i} className={col.className}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-muted py-5" style={{ fontSize: '1rem' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={row.id || i}>
                  {columns.map((col, j) => (
                    <td key={j} className={col.className}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-center mb-0">
            <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(currentPage - 1)}>Prev</button>
            </li>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
                <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
              </li>
            ))}
            <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(currentPage + 1)}>Next</button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
