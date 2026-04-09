import { useEffect, useRef, useState } from 'react';

/**
 * IntersectionObserver-based reveal-on-scroll. Returns a ref + a boolean
 * the consumer can use to attach an .in-view class. Once an element is
 * revealed it stays revealed (no flash on scroll-back).
 */
export function useScrollReveal(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current || inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true); // graceful fallback
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -10% 0px', ...options }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  return [ref, inView];
}

/**
 * Reveal wrapper component — drop it around any block to get
 * fade-up + scale on scroll.
 */
export function Reveal({ children, delay = 0, from = 'up', as: Tag = 'div', className = '', ...props }) {
  const [ref, inView] = useScrollReveal();
  const fromCls = from === 'left' ? 'from-left' : from === 'right' ? 'from-right' : '';
  return (
    <Tag
      ref={ref}
      className={`scroll-reveal ${fromCls} ${inView ? 'in-view' : ''} ${className}`}
      data-delay={delay || undefined}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * Animated count-up that starts when the element enters the viewport.
 *  - target  : final number
 *  - duration: ms to animate
 *  - prefix / suffix: strings shown around the number ("₹", "+", "%", etc.)
 */
export function CountUp({ target, duration = 1600, prefix = '', suffix = '', decimals = 0, className = '' }) {
  const [ref, inView] = useScrollReveal();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic for a snappy "settle" feel
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-IN');
  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}
