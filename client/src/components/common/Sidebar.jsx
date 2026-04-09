import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome, FiSmartphone, FiUsers, FiFileText,
  FiCreditCard, FiHelpCircle, FiSettings, FiShield,
  FiDollarSign, FiList, FiSend, FiChevronDown, FiChevronRight,
  FiPercent, FiLayers, FiBarChart2, FiMessageSquare,
  FiPlusCircle, FiUserCheck, FiBookOpen
} from 'react-icons/fi';

const menuConfig = {
  admin: [
    { path: '/admin', icon: FiHome, label: 'Dashboard', exact: true },
    {
      icon: FiSmartphone, label: 'Recharge', children: [
        { path: '/admin/recharge', label: 'Recharge' },
        { path: '/admin/commission', label: 'My Commission' },
        { path: '/admin/slab-commission', label: 'My Slab Commission' },
      ]
    },
    {
      icon: FiUsers, label: 'Users', children: [
        { path: '/admin/add-customer', label: 'Add Customer' },
        { path: '/admin/users/distributors', label: 'Distributors' },
        { path: '/admin/users/retailers', label: 'Retailers' },
        { path: '/admin/wallet-credit', label: 'Credits/Debits' },
      ]
    },
    {
      icon: FiShield, label: 'KYC Request', children: [
        { path: '/admin/kyc', label: 'KYC Requests' },
      ]
    },
    {
      icon: FiFileText, label: 'Reports', children: [
        { path: '/admin/reports', label: 'Transaction Report' },
        { path: '/admin/reports/wallet', label: 'Wallet Report' },
      ]
    },
    {
      icon: FiCreditCard, label: 'Payment', children: [
        { path: '/admin/payments', label: 'Payment Requests' },
        { path: '/admin/platform-earnings', label: 'Platform Earnings (1%)' },
      ]
    },
    {
      icon: FiHelpCircle, label: 'Support', children: [
        { path: '/admin/support', label: 'Support Tickets' },
      ]
    },
    { path: '/admin/settings', icon: FiSettings, label: 'Settings' },
  ],
  distributor: [
    { path: '/distributor', icon: FiHome, label: 'Dashboard', exact: true },
    {
      icon: FiSmartphone, label: 'Recharge', children: [
        { path: '/distributor/recharge', label: 'Recharge' },
        { path: '/distributor/commission', label: 'My Commission' },
        { path: '/distributor/slab-commission', label: 'My Slab Commission' },
      ]
    },
    {
      icon: FiUsers, label: 'Users', children: [
        { path: '/distributor/retailers', label: 'My Retailers' },
        { path: '/distributor/create-retailer', label: 'Create Retailer' },
      ]
    },
    {
      icon: FiFileText, label: 'Reports', children: [
        { path: '/distributor/transactions', label: 'Transactions' },
        { path: '/distributor/reports', label: 'Reports' },
      ]
    },
    {
      icon: FiCreditCard, label: 'Payment', children: [
        { path: '/distributor/transfer', label: 'Transfer Balance' },
        { path: '/distributor/add-funds', label: 'Add Funds (Online)' },
      ]
    },
    {
      icon: FiHelpCircle, label: 'Support', children: [
        { path: '/distributor/support', label: 'Support Ticket' },
      ]
    },
  ],
  retailer: [
    { path: '/retailer', icon: FiHome, label: 'Dashboard', exact: true },
    {
      icon: FiSmartphone, label: 'Recharge', children: [
        { path: '/retailer/recharge', label: 'Recharge' },
        { path: '/retailer/commission', label: 'My Commission' },
        { path: '/retailer/slab-commission', label: 'My Slab Commission' },
      ]
    },
    {
      icon: FiFileText, label: 'Reports', children: [
        { path: '/retailer/transactions', label: 'Transactions' },
      ]
    },
    {
      icon: FiCreditCard, label: 'Payment', children: [
        { path: '/retailer/wallet', label: 'Wallet' },
        { path: '/retailer/add-funds', label: 'Add Funds (Online)' },
        { path: '/retailer/payment-request', label: 'Add Payment Request' },
      ]
    },
    {
      icon: FiHelpCircle, label: 'Support', children: [
        { path: '/retailer/support', label: 'Support Ticket' },
      ]
    },
  ],
};

function SidebarItem({ item, onClose }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some(c => location.pathname === c.path);
    }
    return false;
  });

  // Simple link (no children)
  if (!item.children) {
    return (
      <li className="nav-item">
        <NavLink
          to={item.path}
          end={item.exact}
          className={({ isActive }) => `nav-link sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <item.icon className="me-3" size={20} />
          <span className="flex-grow-1">{item.label}</span>
        </NavLink>
      </li>
    );
  }

  // Parent with children (expandable)
  const isChildActive = item.children.some(c => location.pathname === c.path);

  return (
    <li className="nav-item">
      <button
        className={`nav-link sidebar-link sidebar-parent w-100 border-0 ${isChildActive ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <item.icon className="me-3" size={20} />
        <span className="flex-grow-1 text-start">{item.label}</span>
        {open ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
      </button>
      {open && (
        <ul className="nav flex-column sidebar-submenu">
          {item.children.map((child) => (
            <li className="nav-item" key={child.path}>
              <NavLink
                to={child.path}
                className={({ isActive }) => `nav-link sidebar-sublink ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <FiChevronRight size={14} className="me-2 submenu-arrow" />
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({ show, onClose }) {
  const { user } = useAuth();
  const menu = menuConfig[user?.role] || [];

  return (
    <>
      {show && <div className="sidebar-overlay" onClick={onClose} />}
      <nav className={`sidebar ${show ? 'show' : ''}`}>
        <div className="sidebar-header">
          <h5 className="mb-1 text-white fw-bold">
            <span className="text-warning">MAHAKAL</span> PAY
          </h5>
          <small className="text-white-50 text-capitalize" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>
            {user?.role === 'admin' ? 'Super Admin' : user?.role === 'distributor' ? 'Super Distributor' : 'Retailer'} Panel
          </small>
        </div>
        <ul className="nav flex-column sidebar-nav">
          {menu.map((item, i) => (
            <SidebarItem key={item.path || item.label} item={item} onClose={onClose} />
          ))}
        </ul>
      </nav>
    </>
  );
}
