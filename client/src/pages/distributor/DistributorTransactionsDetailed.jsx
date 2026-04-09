import { FiList, FiAlertTriangle } from 'react-icons/fi';
import TransactionsDetailedTable from '../../components/common/TransactionsDetailedTable';
import { getDetailedTransactions } from '../../api/distributor.api';

export default function DistributorTransactionsDetailed({ failedOnly = false }) {
  return (
    <div>
      <h4 className="fw-bold mb-2">
        {failedOnly
          ? <><FiAlertTriangle className="me-2 text-danger" />Failed Transactions</>
          : <><FiList className="me-2" />All Transactions</>}
      </h4>
      <p className="text-muted small mb-4">
        {failedOnly
          ? 'Every failed transaction from your retailers, with millisecond timestamps for debugging.'
          : 'Every transaction from your retailers — including your override share on each commission.'}
      </p>
      <TransactionsDetailedTable
        fetcher={getDetailedTransactions}
        role="distributor"
        failedOnly={failedOnly}
      />
    </div>
  );
}
