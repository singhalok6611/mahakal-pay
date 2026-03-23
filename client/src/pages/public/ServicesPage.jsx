import { FiSmartphone, FiTruck, FiMonitor, FiCheckCircle } from 'react-icons/fi';

const services = [
  {
    icon: FiSmartphone,
    title: 'Prepaid Mobile Recharge',
    desc: 'Get all types of prepaid regular and special recharges for all operators across India from all circles. Supports Airtel, Jio, Vi, BSNL, MTNL and more.',
    color: '#3498db',
    features: ['All operators supported', 'Instant processing', 'Best commission rates', 'All circles covered'],
  },
  {
    icon: FiMonitor,
    title: 'DTH Recharge',
    desc: 'Get all types of DTH recharges for all operators across India. Airtel Digital TV, Dish TV, Tata Play, Sun Direct, Videocon D2H and more.',
    color: '#e74c3c',
    features: ['All DTH operators', 'Instant activation', 'Plan details available', 'High success rate'],
  },
  {
    icon: FiTruck,
    title: 'FASTag Recharge',
    desc: 'Quick and easy FASTag recharge for all major banks. Travel worry-free with instant FASTag top-up. Supports Paytm, ICICI, SBI, HDFC, Axis and more.',
    color: '#2ecc71',
    features: ['All bank FASTag', 'Instant recharge', 'Vehicle number based', 'Low commission cost'],
  },
];

export default function ServicesPage() {
  return (
    <>
      <div className="page-banner">
        <div className="container">
          <h2>Our Services</h2>
          <p className="mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.15rem' }}>
            Simple, Powerful & Affordable - One wallet, multiple services
          </p>
        </div>
      </div>
      <div className="container py-5">
        <div className="row g-4">
          {services.map((s, i) => (
            <div className="col-lg-4 col-md-6" key={i}>
              <div className="card service-page-card h-100 text-center p-4">
                <div className="card-body">
                  <div className="service-icon-lg" style={{ background: s.color }}>
                    <s.icon size={44} color="#fff" />
                  </div>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                  <ul className="list-unstyled text-start mt-3">
                    {s.features.map((f, j) => (
                      <li key={j} className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '1rem' }}>
                        <FiCheckCircle color={s.color} size={18} />
                        <span style={{ color: '#555' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
