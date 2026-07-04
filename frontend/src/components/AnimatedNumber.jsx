import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Smoothly tweens the displayed number toward `value` whenever it changes,
 * instead of snapping — makes the dashboard feel alive rather than a static
 * data dump (per the "boss hates robotic data dumps" brief).
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  className = "",
}) {
  const spanRef = useRef(null);
  const tweenTarget = useRef({ val: value });

  useEffect(() => {
    const proxy = tweenTarget.current;
    const tween = gsap.to(proxy, {
      val: value,
      duration: 0.7,
      ease: "power2.out",
      onUpdate: () => {
        if (spanRef.current) {
          spanRef.current.textContent = `${proxy.val.toFixed(decimals)}${suffix}`;
        }
      },
    });
    return () => tween.kill();
  }, [value, decimals, suffix]);

  return (
    <span ref={spanRef} className={className}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
