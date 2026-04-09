import WithdrawalRequestForm from '../../components/common/WithdrawalRequestForm';
import { createWithdrawal, getMyWithdrawals, getDashboard } from '../../api/distributor.api';

// Distributor api doesn't have a dedicated /wallet endpoint — the dashboard
// already returns wallet.balance, so we adapt it to the expected shape.
const getBalance = async () => {
  const res = await getDashboard();
  return { data: { balance: res.data?.wallet?.balance ?? 0 } };
};

export default function DistributorWithdrawal() {
  return (
    <WithdrawalRequestForm
      createWithdrawal={createWithdrawal}
      listMyWithdrawals={getMyWithdrawals}
      getBalance={getBalance}
    />
  );
}
