import { Link } from 'react-router-dom';
import { FiSmartphone, FiTruck, FiMonitor, FiShield, FiDollarSign, FiHeadphones } from 'react-icons/fi';

const features = [
  { icon: FiSmartphone, title: 'Mobile Recharge', desc: 'Instant prepaid recharge for all operators across India from all circles.', color: '#e74c3c' },
  { icon: FiTruck, title: 'FASTag Recharge', desc: 'Quick FASTag recharge for hassle-free toll payments on all highways.', color: '#3498db' },
  { icon: FiMonitor, title: 'DTH Recharge', desc: 'Recharge your DTH connection for uninterrupted entertainment at home.', color: '#2ecc71' },
  { icon: FiShield, title: 'Secure Platform', desc: 'Your transactions are protected with advanced encryption and security.', color: '#9b59b6' },
  { icon: FiDollarSign, title: 'Best Commission', desc: 'Earn the highest commission rates in the industry on every recharge.', color: '#f39c12' },
  { icon: FiHeadphones, title: '24/7 Support', desc: 'Round the clock customer support to help grow your business.', color: '#1abc9c' },
];

const operators = [
  'Airtel', 'Jio', 'Vi', 'BSNL', 'MTNL',
  'Tata Play', 'Dish TV', 'Airtel Digital TV', 'Sun Direct', 'Videocon D2H',
  'Paytm FASTag', 'ICICI FASTag', 'SBI FASTag', 'HDFC FASTag', 'Axis FASTag',
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row align-items-center">
            <div className="col-lg-7">
              <div className="hero-badge">SIMPLE, POWERFUL & AFFORDABLE</div>
              <h1 className="text-white mb-4">
                Pay Bill or Recharge <br />with <span className="text-warning">MAHAKAL PAY</span>
              </h1>
              <p className="lead text-white mb-5">
                Fastest and most reliable recharge service platform.
                Operate all your services from a single account.
                Make your store profitable with one wallet, multiple services.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/login" className="btn btn-warning btn-lg px-5 shadow-lg">
                  Get Started
                </Link>
                <Link to="/services" className="btn btn-outline-light btn-lg px-5">
                  Our Services
                </Link>
              </div>
            </div>
            <div className="col-lg-5 d-none d-lg-flex justify-content-center mt-5 mt-lg-0">
              <div className="hero-illustration">
                <div className="hero-phone-icon">
                  <FiSmartphone size={90} className="text-warning" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tagline */}
      <section className="py-5 text-center" style={{ background: '#f8f9ff' }}>
        <div className="container py-3">
          <h3 className="section-title text-primary">START TODAY FOR A BETTER FUTURE</h3>
          <div className="section-divider"></div>
          <p className="section-subtitle">
            Join thousands of retailers and distributors across India who trust Mahakal Pay for instant recharge services with the best commission rates.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-5">
        <div className="container py-4">
          <h3 className="text-center section-title">FEATURES</h3>
          <div className="section-divider"></div>
          <div className="row g-4">
            {features.map((f, i) => (
              <div className="col-md-6 col-lg-4" key={i}>
                <div className="card border-0 shadow-sm h-100 text-center feature-card">
                  <div className="card-body">
                    <div className="feature-icon mx-auto" style={{ background: f.color }}>
                      <f.icon size={36} color="#fff" />
                    </div>
                    <h5>{f.title}</h5>
                    <p>{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operators */}
      <section className="py-5" style={{ background: '#f8f9ff' }}>
        <div className="container py-4">
          <h3 className="text-center section-title">OUR OPERATORS</h3>
          <div className="section-divider"></div>
          <div className="d-flex flex-wrap justify-content-center gap-3">
            {operators.map((op, i) => (
              <div key={i} className="operator-badge text-center">
                {op}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section text-white text-center">
        <div className="container">
          <h3 className="mb-3">Become a Retailer or Distributor Today</h3>
          <p className="mb-4">Join our growing network and start earning with every recharge transaction</p>
          <Link to="/contact" className="btn btn-warning btn-lg px-5 shadow-lg">
            Contact Us Now
          </Link>
        </div>
      </section>
    </>
  );
}
