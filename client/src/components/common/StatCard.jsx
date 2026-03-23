export default function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', onClick }) {
  return (
    <div
      className={`card stat-card border-0 shadow-sm h-100 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ borderLeft: `5px solid var(--bs-${color})` }}
    >
      <div className="card-body d-flex align-items-center justify-content-between">
        <div>
          <p className="text-muted mb-1">{title}</p>
          <h4 className={`mb-0 text-${color}`}>{value}</h4>
          {subtitle && <small className="text-muted">{subtitle}</small>}
        </div>
        {Icon && (
          <div className={`stat-icon bg-${color} bg-opacity-10 text-${color}`}>
            <Icon size={26} />
          </div>
        )}
      </div>
    </div>
  );
}
