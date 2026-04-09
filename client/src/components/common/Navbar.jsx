import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiLogIn, FiGrid } from 'react-icons/fi';

export default function PublicNavbar() {
  const { isAuthenticated, user } = useAuth();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark public-navbar sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/">
          <img src="/logo-mark.svg" alt="" width="36" height="36" />
          <span><span className="text-warning">MAHAKAL</span> PAY</span>
        </Link>
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#publicNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="publicNav">
          <ul className="navbar-nav ms-auto align-items-lg-center">
            <li className="nav-item">
              <NavLink className="nav-link" to="/" end>Home</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/about">About Us</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/services">Services</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/operators">Operators</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/faq">FAQ's</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/contact">Contact</NavLink>
            </li>
            <li className="nav-item ms-lg-3 mt-2 mt-lg-0">
              {isAuthenticated ? (
                <Link className="btn btn-warning d-flex align-items-center gap-2" to={`/${user.role}`}>
                  <FiGrid size={16} /> Dashboard
                </Link>
              ) : (
                <Link className="btn btn-warning d-flex align-items-center gap-2" to="/login">
                  <FiLogIn size={16} /> Login
                </Link>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
