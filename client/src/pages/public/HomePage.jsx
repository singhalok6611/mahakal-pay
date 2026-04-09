import { Link } from 'react-router-dom';
import {
  FiSmartphone, FiTruck, FiMonitor, FiShield, FiDollarSign, FiHeadphones,
  FiArrowRight, FiZap, FiCreditCard, FiWifi, FiTv,
  FiUsers, FiActivity, FiAward, FiClock,
} from 'react-icons/fi';

const features = [
  { icon: FiSmartphone, title: 'Mobile Recharge', desc: 'Instant prepaid recharge for all operators across India from every circle.', color: 'linear-gradient(135deg,#ef4444,#f97316)' },
  { icon: FiTruck,      title: 'FASTag Recharge', desc: 'Quick FASTag top-up for hassle-free toll payments on all highways.',         color: 'linear-gradient(135deg,#3b82f6,#0ea5e9)' },
  { icon: FiMonitor,    title: 'DTH Recharge',    desc: 'Recharge your DTH connection for uninterrupted entertainment at home.',     color: 'linear-gradient(135deg,#10b981,#22c55e)' },
  { icon: FiShield,     title: 'Bank-grade Security', desc: 'Every transaction is protected by JWT auth, refresh tokens and signed payloads.', color: 'linear-gradient(135deg,#8b5cf6,#a855f7)' },
  { icon: FiDollarSign, title: 'Best Commission', desc: 'Industry-leading commission rates on every recharge — credited instantly to your wallet.', color: 'linear-gradient(135deg,#f59e0b,#eab308)' },
  { icon: FiHeadphones, title: '24/7 Support',    desc: 'Round-the-clock support so your business never has to wait.',                color: 'linear-gradient(135deg,#06b6d4,#14b8a6)' },
];

const stats = [
  { icon: FiUsers,    value: '10K+',   label: 'Active Retailers' },
  { icon: FiActivity, value: '50K+',   label: 'Daily Transactions' },
  { icon: FiAward,    value: '99.9%',  label: 'Uptime SLA' },
  { icon: FiClock,    value: '< 5s',   label: 'Avg Settlement' },
];

const operators = [
  'Airtel', 'Jio', 'Vi', 'BSNL', 'MTNL',
  'Tata Play', 'Dish TV', 'Airtel Digital TV', 'Sun Direct', 'Videocon D2H',
  'Paytm FASTag', 'ICICI FASTag', 'SBI FASTag', 'HDFC FASTag', 'Axis FASTag', 'Kotak FASTag',
];

export default function HomePage() {
  return (
    <>
      {/* ──────────────── HERO ──────────────── */}
      <section className="hero-modern">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <div className="hero-eyebrow reveal">
                <span className="dot" />
                LIVE · INSTANT · TRUSTED
              </div>
              <h1 className="hero-title reveal delay-1">
                Recharge in seconds.<br />
                Earn with every<br />
                <span className="grad-gold">tap.</span>
              </h1>
              <p className="hero-subtitle reveal delay-2">
                Mahakal Pay is the recharge &amp; bill-payment platform built for Indian retailers.
                One wallet, every operator, instant settlement, best-in-class commission. Run your
                whole counter from a single dashboard.
              </p>
              <div className="d-flex flex-wrap gap-3 reveal delay-3">
                <Link to="/login" className="btn btn-cta-glow d-inline-flex align-items-center gap-2">
                  Get Started <FiArrowRight />
                </Link>
                <Link to="/services" className="btn btn-ghost d-inline-flex align-items-center gap-2">
                  Explore Services
                </Link>
              </div>
            </div>

            <div className="col-lg-5 d-none d-lg-flex justify-content-center reveal-fade delay-4">
              <div className="hero-illu">
                <div className="ring" />
                <div className="ring r2" />
                <div className="core">
                  <FiZap size={70} color="#1a237e" />
                </div>
                <div className="chip c1"><FiSmartphone size={26} /></div>
                <div className="chip c2"><FiTv         size={26} /></div>
                <div className="chip c3"><FiCreditCard size={26} /></div>
                <div className="chip c4"><FiWifi       size={26} /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── STATS STRIP ──────────────── */}
      <section className="stats-strip">
        <div className="container">
          <div className="row g-3">
            {stats.map((s, i) => (
              <div className="col-6 col-md-3" key={s.label}>
                <div className={`stats-card reveal delay-${i + 1}`}>
                  <s.icon size={28} className="text-primary mb-2" />
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── FEATURES ──────────────── */}
      <section className="py-5">
        <div className="container py-4">
          <div className="text-center mb-5 reveal">
            <p className="text-uppercase fw-bold mb-2" style={{ color: '#8b5cf6', letterSpacing: '2px', fontSize: '0.85rem' }}>
              WHY MAHAKAL PAY
            </p>
            <h2 className="fw-bold" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', color: '#1a237e' }}>
              Built for serious retailers.
            </h2>
            <p className="text-muted mx-auto" style={{ maxWidth: 560 }}>
              A recharge counter is a high-volume, low-margin business. We obsess over the details
              so every commission, every refund, every audit row is exactly right.
            </p>
          </div>
          <div className="row g-4">
            {features.map((f, i) => (
              <div className="col-md-6 col-lg-4" key={f.title}>
                <div className={`feature-card-modern reveal delay-${(i % 6) + 1}`}>
                  <div className="feature-icon-modern" style={{ background: f.color }}>
                    <f.icon size={28} />
                  </div>
                  <h5>{f.title}</h5>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── OPERATORS MARQUEE ──────────────── */}
      <section className="py-5" style={{ background: '#f8f9ff' }}>
        <div className="container">
          <div className="text-center mb-4 reveal">
            <p className="text-uppercase fw-bold mb-2" style={{ color: '#8b5cf6', letterSpacing: '2px', fontSize: '0.85rem' }}>
              ALL MAJOR OPERATORS
            </p>
            <h2 className="fw-bold" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#1a237e' }}>
              Every brand your customers ask for.
            </h2>
          </div>
        </div>
        <div className="marquee">
          <div className="marquee-track">
            {[...operators, ...operators].map((op, i) => (
              <div key={i} className="pill">{op}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── CTA ──────────────── */}
      <section className="cta-modern">
        <div className="container">
          <h3 className="reveal">Become a Retailer or Distributor today.</h3>
          <p className="reveal delay-1">
            Join the Mahakal Pay network and start earning with every recharge transaction.
          </p>
          <div className="reveal delay-2">
            <Link to="/contact" className="btn btn-cta-glow d-inline-flex align-items-center gap-2">
              Contact Us Now <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
