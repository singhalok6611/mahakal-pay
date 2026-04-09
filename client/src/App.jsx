import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/common/DashboardLayout';
import PublicNavbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Public Pages
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import ServicesPage from './pages/public/ServicesPage';
import OperatorsPage from './pages/public/OperatorsPage';
import FAQPage from './pages/public/FAQPage';
import ContactPage from './pages/public/ContactPage';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminKYC from './pages/admin/AdminKYC';
import AdminReports from './pages/admin/AdminReports';
import AdminPayments from './pages/admin/AdminPayments';
import AdminSupport from './pages/admin/AdminSupport';
import AdminSettings from './pages/admin/AdminSettings';
import AdminRecharge from './pages/admin/AdminRecharge';
import AdminAddCustomer from './pages/admin/AdminAddCustomer';
import AdminDistributors from './pages/admin/AdminDistributors';
import AdminRetailers from './pages/admin/AdminRetailers';
import AdminWalletCredit from './pages/admin/AdminWalletCredit';
import AdminWalletReport from './pages/admin/AdminWalletReport';
import AdminPlatformEarnings from './pages/admin/AdminPlatformEarnings';
import AdminRetailerApprovals from './pages/admin/AdminRetailerApprovals';
import AdminTransactionsDetailed from './pages/admin/AdminTransactionsDetailed';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';

// Distributor
import DistributorDashboard from './pages/distributor/DistributorDashboard';
import DistributorRetailers from './pages/distributor/DistributorRetailers';
import DistributorTransactions from './pages/distributor/DistributorTransactions';
import DistributorTransfer from './pages/distributor/DistributorTransfer';
import DistributorReports from './pages/distributor/DistributorReports';
import DistributorRecharge from './pages/distributor/DistributorRecharge';
import DistributorCreateRetailer from './pages/distributor/DistributorCreateRetailer';
import DistributorSupport from './pages/distributor/DistributorSupport';
import DistributorTransactionsDetailed from './pages/distributor/DistributorTransactionsDetailed';
import DistributorWithdrawal from './pages/distributor/DistributorWithdrawal';

// Retailer
import RetailerDashboard from './pages/retailer/RetailerDashboard';
import RetailerRecharge from './pages/retailer/RetailerRecharge';
import RetailerTransactions from './pages/retailer/RetailerTransactions';
import RetailerWallet from './pages/retailer/RetailerWallet';
import RetailerSupport from './pages/retailer/RetailerSupport';
import RetailerPaymentRequest from './pages/retailer/RetailerPaymentRequest';
import RetailerAddFunds from './pages/retailer/RetailerAddFunds';
import RetailerTransactionsDetailed from './pages/retailer/RetailerTransactionsDetailed';
import RetailerWithdrawal from './pages/retailer/RetailerWithdrawal';
import RetailerTransfer from './pages/retailer/RetailerTransfer';

// Common
import CommissionPage from './pages/common/CommissionPage';
import SlabCommissionPage from './pages/common/SlabCommissionPage';

function PublicLayout() {
  return (
    <>
      <PublicNavbar />
      <main style={{ minHeight: '60vh' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="operators" element={<OperatorsPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="contact" element={<ContactPage />} />
          </Route>

          {/* Login */}
          <Route path="login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/recharge" element={<AdminRecharge />} />
              <Route path="admin/commission" element={<CommissionPage />} />
              <Route path="admin/slab-commission" element={<SlabCommissionPage />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/add-customer" element={<AdminAddCustomer />} />
              <Route path="admin/users/distributors" element={<AdminDistributors />} />
              <Route path="admin/users/retailers" element={<AdminRetailers />} />
              <Route path="admin/users/retailer-approvals" element={<AdminRetailerApprovals />} />
              <Route path="admin/wallet-credit" element={<AdminWalletCredit />} />
              <Route path="admin/transactions" element={<AdminTransactions />} />
              <Route path="admin/transactions/all" element={<AdminTransactionsDetailed failedOnly={false} />} />
              <Route path="admin/transactions/failed" element={<AdminTransactionsDetailed failedOnly={true} />} />
              <Route path="admin/kyc" element={<AdminKYC />} />
              <Route path="admin/reports" element={<AdminReports />} />
              <Route path="admin/reports/wallet" element={<AdminWalletReport />} />
              <Route path="admin/payments" element={<AdminPayments />} />
              <Route path="admin/platform-earnings" element={<AdminPlatformEarnings />} />
              <Route path="admin/withdrawals" element={<AdminWithdrawals />} />
              <Route path="admin/support" element={<AdminSupport />} />
              <Route path="admin/settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Distributor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['distributor']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="distributor" element={<DistributorDashboard />} />
              <Route path="distributor/recharge" element={<DistributorRecharge />} />
              <Route path="distributor/commission" element={<CommissionPage />} />
              <Route path="distributor/slab-commission" element={<SlabCommissionPage />} />
              <Route path="distributor/retailers" element={<DistributorRetailers />} />
              <Route path="distributor/create-retailer" element={<DistributorCreateRetailer />} />
              <Route path="distributor/transactions" element={<DistributorTransactions />} />
              <Route path="distributor/transactions/all" element={<DistributorTransactionsDetailed failedOnly={false} />} />
              <Route path="distributor/transactions/failed" element={<DistributorTransactionsDetailed failedOnly={true} />} />
              <Route path="distributor/transfer" element={<DistributorTransfer />} />
              <Route path="distributor/withdrawals" element={<DistributorWithdrawal />} />
              <Route path="distributor/add-funds" element={<RetailerAddFunds />} />
              <Route path="distributor/reports" element={<DistributorReports />} />
              <Route path="distributor/support" element={<DistributorSupport />} />
            </Route>
          </Route>

          {/* Retailer Routes */}
          <Route element={<ProtectedRoute allowedRoles={['retailer']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="retailer" element={<RetailerDashboard />} />
              <Route path="retailer/recharge" element={<RetailerRecharge />} />
              <Route path="retailer/commission" element={<CommissionPage />} />
              <Route path="retailer/slab-commission" element={<SlabCommissionPage />} />
              <Route path="retailer/transactions" element={<RetailerTransactions />} />
              <Route path="retailer/transactions/all" element={<RetailerTransactionsDetailed failedOnly={false} />} />
              <Route path="retailer/transactions/failed" element={<RetailerTransactionsDetailed failedOnly={true} />} />
              <Route path="retailer/wallet" element={<RetailerWallet />} />
              <Route path="retailer/payment-request" element={<RetailerPaymentRequest />} />
              <Route path="retailer/withdrawals" element={<RetailerWithdrawal />} />
              <Route path="retailer/transfer" element={<RetailerTransfer />} />
              <Route path="retailer/add-funds" element={<RetailerAddFunds />} />
              <Route path="retailer/support" element={<RetailerSupport />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
