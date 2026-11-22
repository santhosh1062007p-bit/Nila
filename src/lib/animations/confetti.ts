import confetti from 'canvas-confetti';

// Premium Bakery Palette (Burgundy, Soft Pink, Goldenrod, Champagne, Cream)
const BAKERY_COLORS = ['#8F1237', '#A51235', '#FCE8EC', '#F59E0B', '#FCD34D', '#FFFDFC'];

/**
 * Birthday Celebration Fireworks Cannon
 * Shoots celebratory bursts from both sides and center for birthday orders
 */
export function triggerBirthdayCelebration() {
  if (typeof window === 'undefined') return;

  const duration = 2500;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, colors: BAKERY_COLORS };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: ReturnType<typeof setInterval> = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Left cannon
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    // Right cannon
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

/**
 * Standard Fresh Bakery Order Confetti Fountain
 */
export function triggerOrderSuccessConfetti() {
  if (typeof window === 'undefined') return;

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: BAKERY_COLORS,
    zIndex: 9999,
  });
}
