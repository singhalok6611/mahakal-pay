import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-dark text-white pt-5 pb-3">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-3 col-md-6">
            <h5 className="fw-bold mb-3">
              <span className="text-warning">MAHAKAL</span> PAY
            </h5>
            <p className="text-white-50" style={{ lineHeight: 1.8 }}>
              Your trusted partner for instant recharge and bill payments.
              Simple, powerful and affordable service platform.
            </p>
          </div>
          <div className="col-lg-3 col-md-6">
            <h6 className="mb-3 text-white">Quick Links</h6>
            <ul className="list-unstyled">
              <li className="mb-2"><Link to="/" className="text-white-50 text-decoration-none">Home</Link></li>
              <li className="mb-2"><Link to="/about" className="text-white-50 text-decoration-none">About Us</Link></li>
              <li className="mb-2"><Link to="/services" className="text-white-50 text-decoration-none">Services</Link></li>
              <li className="mb-2"><Link to="/faq" className="text-white-50 text-decoration-none">FAQ's</Link></li>
              <li className="mb-2"><Link to="/contact" className="text-white-50 text-decoration-none">Contact Us</Link></li>
            </ul>
          </div>
          <div className="col-lg-3 col-md-6">
            <h6 className="mb-3 text-white">Services</h6>
            <ul className="list-unstyled">
              <li className="mb-2 text-white-50">Mobile Recharge</li>
              <li className="mb-2 text-white-50">DTH Recharge</li>
              <li className="mb-2 text-white-50">FASTag Recharge</li>
            </ul>
          </div>
          <div className="col-lg-3 col-md-6">
            <h6 className="mb-3 text-white">Contact Info</h6>
            <ul className="list-unstyled">
              <li className="mb-2 text-white-50">support@mahakal.com</li>
              <li className="mb-2 text-white-50">+91 9999999999</li>
              <li className="mb-2 text-white-50">Mon - Sat: 10AM - 6PM</li>
            </ul>
          </div>
        </div>
        <hr className="border-secondary my-4" />
        <div className="d-flex flex-wrap justify-content-between align-items-center">
          <p className="text-white-50 mb-0">&copy; {new Date().getFullYear()} MAHAKAL PAY. All Rights Reserved.</p>
          <div className="d-flex gap-3 mt-2 mt-md-0">
            <Link to="/about" className="text-white-50 text-decoration-none small">Terms & Conditions</Link>
            <Link to="/about" className="text-white-50 text-decoration-none small">Privacy Policy</Link>
            <Link to="/about" className="text-white-50 text-decoration-none small">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
