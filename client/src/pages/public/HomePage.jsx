import { Link } from 'react-router-dom';
import {
  FiSmartphone, FiTv, FiZap, FiArrowRight,
  FiShield, FiActivity, FiCheckCircle,
  FiUserPlus, FiCreditCard, FiRefreshCw, FiAward,
  FiDroplet, FiUsers, FiClock,
} from 'react-icons/fi';
import { Reveal, CountUp } from '../../hooks/useScrollReveal';

const whyChoose = [
  {
    icon: FiShield,
    title: 'Bank-Grade Security',
    desc: 'Every transaction is protected by JWT auth, signed payloads and refresh token rotation. Your wallet is never at risk.',
    cls: '',
  },
  {
    icon: FiActivity,
    title: 'Fastest Transaction',
    desc: 'Sub-5-second settlement on every recharge. The customer is in and out before they finish counting cash.',
    cls: 'alt',
  },
  {
    icon: FiCheckCircle,
    title: 'Reliability',
    desc: 'Multi-provider routing, automatic retries on operator timeouts and instant refunds on failed recharges.',
    cls: 'alt2',
  },
];

const services = [
  { icon: FiSmartphone, title: 'Mobile Recharge' },
  { icon: FiTv,         title: 'DTH Pay' },
  { icon: FiZap,        title: 'Electricity Bill' },
  { icon: FiDroplet,    title: 'Gas Bill' },
];

const steps = [
  { icon: FiUserPlus,   title: 'Register',     desc: 'Sign up as a retailer through your distributor.' },
  { icon: FiCreditCard, title: 'Add Money',    desc: 'Top up your wallet via UPI, NEFT or bank transfer.' },
  { icon: FiRefreshCw,  title: 'Pay / Recharge', desc: 'Run mobile, DTH, FASTag and bill-pay from one screen.' },
  { icon: FiAward,      title: 'Get Benefits', desc: 'Earn commission on every successful transaction.' },
];

const testimonials = [
  {
    quote: 'Mahakal Pay completely changed how I run my counter. The settlement is instant and the commission rates are the best I have seen.',
    name: 'Rajesh Kumar',
    role: 'Distributor, Mumbai',
    initials: 'RK',
    avatarCls: 'gold',
  },
  {
    quote: 'I switched from another platform last year. The dashboard is clean, refunds are automatic, and the support team actually responds.',
    name: 'Priya Singh',
    role: 'Retailer, Pune',
    initials: 'PS',
    avatarCls: '',
  },
  {
    quote: 'Daily volume tripled within three months of joining. The marketplace of operators they support is the widest in the industry.',
    name: 'Amit Sharma',
    role: 'Retailer, Mumbai',
    initials: 'AS',
    avatarCls: 'green',
  },
];

export default function HomePage() {
  return (
    <>
      {/* ──────────────── HERO ──────────────── */}
      <section className="hero-modern section-relative">
        <div className="parallax-orbs">
          <div className="orb o1" />
          <div className="orb o2" />
          <div className="orb o3" />
        </div>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <Reveal className="hero-eyebrow">
                <span className="dot" />
                SIMPLE · POWERFUL · AFFORDABLE
              </Reveal>
              <Reveal as="h1" delay={1} className="hero-title">
                Pay Bill or Recharge<br />
                with <span className="grad-gold">MAHAKAL PAY</span><span className="caret">&nbsp;</span>
              </Reveal>
              <Reveal as="p" delay={2} className="hero-subtitle">
                Fastest and most reliable recharge service platform.
                Operate all your services from a single account.
                Make your store profitable with one wallet, multiple services.
              </Reveal>
              <Reveal delay={3} className="d-flex flex-wrap gap-3">
                <Link to="/login" className="btn btn-cta-glow d-inline-flex align-items-center gap-2">
                  Get Started <FiArrowRight />
                </Link>
                <Link to="/services" className="btn btn-ghost d-inline-flex align-items-center gap-2">
                  Our Services
                </Link>
              </Reveal>
            </div>

            <div className="col-lg-5 d-none d-lg-flex justify-content-center">
              <Reveal from="right" delay={2}>
                <div className="phone-frame">
                  <FiSmartphone size={110} color="#ffc107" strokeWidth={1.5} />
                </div>
              </Reveal>
            </div>
          </div>
        </div>

        {/* wave divider into the next section */}
        <svg className="wave-divider" viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <path
            fill="#ffffff"
            d="M0,64 C320,128 720,0 1080,48 C1260,72 1380,96 1440,80 L1440,120 L0,120 Z"
          />
        </svg>
      </section>

      {/* ──────────────── ANIMATED COUNTERS STRIP ──────────────── */}
      <section className="py-5" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="row g-4 text-center">
            <Reveal delay={1} className="col-6 col-md-3">
              <FiUsers size={30} className="mb-2" style={{ color: '#8b5cf6' }} />
              <div className="stat-value-cinematic"><CountUp target={10000} suffix="+" /></div>
              <div className="stat-label">Active Retailers</div>
            </Reveal>
            <Reveal delay={2} className="col-6 col-md-3">
              <FiActivity size={30} className="mb-2" style={{ color: '#8b5cf6' }} />
              <div className="stat-value-cinematic"><CountUp target={50000} suffix="+" /></div>
              <div className="stat-label">Daily Transactions</div>
            </Reveal>
            <Reveal delay={3} className="col-6 col-md-3">
              <FiAward size={30} className="mb-2" style={{ color: '#8b5cf6' }} />
              <div className="stat-value-cinematic"><CountUp target={99.9} decimals={1} suffix="%" /></div>
              <div className="stat-label">Uptime SLA</div>
            </Reveal>
            <Reveal delay={4} className="col-6 col-md-3">
              <FiClock size={30} className="mb-2" style={{ color: '#8b5cf6' }} />
              <div className="stat-value-cinematic">&lt;&nbsp;<CountUp target={5} />s</div>
              <div className="stat-label">Avg Settlement</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ──────────────── WHY CHOOSE US ──────────────── */}
      <section className="py-5 section-relative" style={{ background: '#ffffff' }}>
        <div className="parallax-orbs">
          <div className="orb o1" style={{ opacity: 0.3 }} />
        </div>
        <div className="container py-4">
          <Reveal as="span" className="section-eyebrow">WHY MAHAKAL PAY</Reveal>
          <Reveal as="h2" delay={1} className="section-heading">Why Choose Us</Reveal>
          <div className="section-heading-divider" />
          <Reveal as="p" delay={2} className="section-sub">
            A recharge counter is a high-volume, low-margin business. We obsess over the details
            so every commission, every refund and every audit row is exactly right.
          </Reveal>
          <div className="row g-4">
            {whyChoose.map((w, i) => (
              <Reveal delay={i + 1} className="col-md-4" key={w.title}>
                <div className={`why-card ${w.cls}`}>
                  <div className="why-icon-wrap">
                    <w.icon size={36} />
                  </div>
                  <h5>{w.title}</h5>
                  <p>{w.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── FEATURED SERVICES ──────────────── */}
      <section className="py-5 section-relative" style={{ background: '#f8f9ff' }}>
        <div className="parallax-orbs">
          <div className="orb o2" style={{ opacity: 0.4 }} />
        </div>
        <div className="container py-4">
          <Reveal as="span" className="section-eyebrow">WHAT WE OFFER</Reveal>
          <Reveal as="h2" delay={1} className="section-heading">Featured Services</Reveal>
          <div className="section-heading-divider" />
          <div className="row g-4">
            {services.map((s, i) => (
              <Reveal delay={i + 1} className="col-6 col-md-3" key={s.title}>
                <div className="service-card">
                  <div className="service-icon-box">
                    <s.icon size={36} />
                  </div>
                  <h6>{s.title}</h6>
                  <Link to="/services" className="learn-more">
                    Learn More <FiArrowRight size={13} />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── HOW IT WORKS ──────────────── */}
      <section className="py-5" style={{ background: '#ffffff' }}>
        <div className="container py-4">
          <Reveal as="span" className="section-eyebrow">PROCESS</Reveal>
          <Reveal as="h2" delay={1} className="section-heading">How it Works</Reveal>
          <div className="section-heading-divider" />
          <div className="howitworks">
            <div className="row g-4">
              {steps.map((step, i) => (
                <Reveal delay={i + 1} className="col-6 col-md-3" key={step.title}>
                  <div className="step">
                    <div className="step-icon">
                      <step.icon size={36} />
                      <span className="step-number">{i + 1}</span>
                    </div>
                    <h6>{step.title}</h6>
                    <p>{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── TESTIMONIALS ──────────────── */}
      <section className="py-5 section-relative" style={{ background: '#f8f9ff' }}>
        <div className="parallax-orbs">
          <div className="orb o3" style={{ opacity: 0.35 }} />
        </div>
        <div className="container py-4">
          <Reveal as="span" className="section-eyebrow">TRUSTED BY RETAILERS</Reveal>
          <Reveal as="h2" delay={1} className="section-heading">Client Testimonials</Reveal>
          <div className="section-heading-divider" />
          <div className="row g-4">
            {testimonials.map((t, i) => (
              <Reveal from={i === 0 ? 'left' : i === 2 ? 'right' : 'up'} delay={i + 1} className="col-md-4" key={t.name}>
                <div className="testimonial-card">
                  <p>{t.quote}</p>
                  <div className="testimonial-author">
                    <div className={`testimonial-avatar ${t.avatarCls}`}>{t.initials}</div>
                    <div>
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── JOIN OUR NETWORK CTA ──────────────── */}
      <section className="join-banner section-relative">
        <div className="parallax-orbs">
          <div className="orb o1" />
          <div className="orb o2" />
        </div>
        <div className="container">
          <div className="row align-items-center g-4">
            <Reveal from="left" className="col-md-8">
              <h3>Join Our Network of Successful Retailers</h3>
              <p>Start earning with every recharge. Onboard through your distributor or contact us directly.</p>
            </Reveal>
            <Reveal from="right" delay={2} className="col-md-4 text-md-end">
              <Link to="/contact" className="btn btn-cta-glow d-inline-flex align-items-center gap-2">
                Register Now <FiArrowRight />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
