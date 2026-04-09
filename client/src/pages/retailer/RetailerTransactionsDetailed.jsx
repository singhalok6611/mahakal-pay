import { FiList, FiAlertTriangle } from 'react-icons/fi';
import TransactionsDetailedTable from '../../components/common/TransactionsDetailedTable';
import { getDetailedTransactions } from '../../api/retailer.api';

export default function RetailerTransactionsDetailed({ failedOnly = false }) {
  return (
    <div>
      <h4 className="fw-bold mb-2">
        {failedOnly
          ? <><FiAlertTriangle className="me-2 text-danger" />Failed Transactions</>
          : <><FiList className="me-2" />All Transactions</>}
      </h4>
      <p className="text-muted small mb-4">
        {failedOnly
          ? 'Your failed transactions, with millisecond timestamps for support tickets.'
          : 'Your own transactions and the commission you earned on each.'}
      </p>
      <TransactionsDetailedTable
        fetcher={getDetailedTransactions}
        role="retailer"
        failedOnly={failedOnly}
      />
    </div>
  );
}
