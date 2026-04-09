import WithdrawalRequestForm from '../../components/common/WithdrawalRequestForm';
import { createWithdrawal, getMyWithdrawals, getWallet } from '../../api/retailer.api';

export default function RetailerWithdrawal() {
  return (
    <WithdrawalRequestForm
      createWithdrawal={createWithdrawal}
      listMyWithdrawals={getMyWithdrawals}
      getBalance={getWallet}
    />
  );
}
