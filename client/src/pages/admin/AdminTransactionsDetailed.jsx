import { FiList, FiAlertTriangle } from 'react-icons/fi';
import TransactionsDetailedTable from '../../components/common/TransactionsDetailedTable';
import { getDetailedTransactions } from '../../api/admin.api';

export default function AdminTransactionsDetailed({ failedOnly = false }) {
  return (
    <div>
      <h4 className="fw-bold mb-2">
        {failedOnly
          ? <><FiAlertTriangle className="me-2 text-danger" />Failed Transactions</>
          : <><FiList className="me-2" />All Transactions</>}
      </h4>
      <p className="text-muted small mb-4">
        {failedOnly
          ? 'Every failed transaction across the platform with millisecond timestamps for debugging.'
          : 'Every transaction across the platform with full commission breakdown (retailer, distributor, admin).'}
      </p>
      <TransactionsDetailedTable
        fetcher={getDetailedTransactions}
        role="admin"
        failedOnly={failedOnly}
      />
    </div>
  );
}
