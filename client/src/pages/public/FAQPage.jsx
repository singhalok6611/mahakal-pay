const faqs = [
  {
    q: 'What is Mahakal Pay?',
    a: 'Mahakal Pay is an online recharge platform offering Mobile Recharge, DTH Recharge, and FASTag Recharge services across India. We provide the best commission rates to our retailers and distributors.',
  },
  {
    q: 'How to register at this site?',
    a: 'To register as a retailer, you need to contact a distributor. Distributors are created by the admin. Contact us at support@mahakal.com for more details on how to get started.',
  },
  {
    q: 'Can I recharge any number at this website?',
    a: 'Yes, you can recharge any prepaid mobile number, DTH subscription, and FASTag at our website or mobile application. We support all major operators across India.',
  },
  {
    q: 'What to do if my account has been debited but not got recharge?',
    a: "In case you haven't received your recharge after successful payment, the amount will be automatically refunded to your wallet. You can check the same in your wallet transaction history.",
  },
  {
    q: 'How to become an Online Distributor/Retailer?',
    a: 'You can join us as our business partner. We are offering recharge facility to our business partners. If you want to start local business in your town or territory, contact us at support@mahakal.com.',
  },
  {
    q: 'How can I add funds to my account?',
    a: 'You need to transfer the amount to our bank via NEFT/RTGS/IMPS/UPI. After making payment, login to your account and submit a "Payment Request" with your transaction details. We will process your request and add balance within 5-60 minutes during business hours.',
  },
  {
    q: 'How can I trust you?',
    a: 'We maintain complete transparency with our retailers and distributors. Our software provides real-time commission tracking, detailed transaction history with debit & credit notes. You can verify every single transaction in your account.',
  },
];

export default function FAQPage() {
  return (
    <>
      <div className="page-banner">
        <div className="container">
          <h2>Frequently Asked Questions</h2>
          <p className="mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.15rem' }}>
            Got questions? We have answers
          </p>
        </div>
      </div>
      <div className="container py-5">
        <div className="mx-auto" style={{ maxWidth: 850 }}>
          <div className="accordion" id="faqAccordion">
            {faqs.map((faq, i) => (
              <div className="accordion-item" key={i}>
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button ${i > 0 ? 'collapsed' : ''}`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#faq-${i}`}
                  >
                    {faq.q}
                  </button>
                </h2>
                <div
                  id={`faq-${i}`}
                  className={`accordion-collapse collapse ${i === 0 ? 'show' : ''}`}
                  data-bs-parent="#faqAccordion"
                >
                  <div className="accordion-body">{faq.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
