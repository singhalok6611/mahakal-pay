import { FiCheck, FiSmartphone, FiMonitor, FiTruck } from 'react-icons/fi';

const highlights = [
  'A hassle-free online recharge experience',
  'Best commission rates for retailers and distributors',
  'Instant recharge processing with high success rate',
  'Secure and reliable transactions',
  '24/7 dedicated customer support',
  'Single wallet for all services',
];

export default function AboutPage() {
  return (
    <>
      <div className="page-banner">
        <div className="container">
          <h2>About Us</h2>
          <p className="mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.15rem' }}>
            Know more about Mahakal Pay
          </p>
        </div>
      </div>
      <div className="container py-5">
        <div className="row g-5">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm p-4 p-lg-5 h-100">
              <h3 className="fw-bold mb-4" style={{ fontSize: '1.8rem' }}>About MAHAKAL PAY</h3>
              <p style={{ fontSize: '1.1rem', lineHeight: 2 }}>
                We at MAHAKAL PAY offer our customers services like Mobile Recharge, DTH Recharge,
                and FASTag Recharge through our trusted platform. Our aim is to provide a hassle-free
                online experience for all your recharge needs with the best commission rates in the industry.
              </p>

              <h4 className="fw-bold mt-4 mb-3" style={{ fontSize: '1.4rem' }}>What Makes Us Unique?</h4>
              <div className="row g-3">
                {highlights.map((item, i) => (
                  <div className="col-md-6" key={i}>
                    <div className="d-flex align-items-start gap-2">
                      <FiCheck size={20} className="text-success mt-1 flex-shrink-0" />
                      <span style={{ fontSize: '1.05rem', color: '#555' }}>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm p-4 p-lg-5 h-100">
              <h4 className="fw-bold mb-4" style={{ fontSize: '1.4rem' }}>Our Services</h4>
              <div className="d-flex flex-column gap-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="feature-icon flex-shrink-0" style={{ background: '#3498db', width: 60, height: 60 }}>
                    <FiSmartphone size={26} color="#fff" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1" style={{ fontSize: '1.1rem' }}>Mobile Recharge</h6>
                    <p className="mb-0" style={{ fontSize: '0.95rem', color: '#777' }}>Airtel, Jio, Vi, BSNL and more</p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="feature-icon flex-shrink-0" style={{ background: '#e74c3c', width: 60, height: 60 }}>
                    <FiMonitor size={26} color="#fff" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1" style={{ fontSize: '1.1rem' }}>DTH Recharge</h6>
                    <p className="mb-0" style={{ fontSize: '0.95rem', color: '#777' }}>Tata Play, Dish TV, Airtel Digital TV</p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="feature-icon flex-shrink-0" style={{ background: '#2ecc71', width: 60, height: 60 }}>
                    <FiTruck size={26} color="#fff" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1" style={{ fontSize: '1.1rem' }}>FASTag Recharge</h6>
                    <p className="mb-0" style={{ fontSize: '0.95rem', color: '#777' }}>All major bank FASTag supported</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
