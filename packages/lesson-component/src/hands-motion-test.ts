import type { TimingAvatar } from './timing-avatar';

export function setupHandsMotionTest(container: HTMLElement) {
  const toggle = container.querySelector<HTMLButtonElement>('#motion-test-toggle')!;
  const resetButton = container.querySelector<HTMLButtonElement>('#motion-test-reset')!;
  const status = container.querySelector<HTMLElement>('#motion-test-status')!;
  const stage = container.querySelector<HTMLElement>('#motion-test-stage')!;
  let avatar: TimingAvatar | undefined;
  let animation = 0;
  let elapsed = 0;
  let previous: number | undefined;
  let running = false;
  let generation = 0;

  function pause(message = 'Paused — synthetic motion only; not sign language.') {
    running = false;
    cancelAnimationFrame(animation);
    previous = undefined;
    toggle.textContent = 'Resume motion test';
    status.textContent = message;
  }

  function reset() {
    generation++;
    running = false;
    cancelAnimationFrame(animation);
    avatar?.dispose();
    avatar = undefined;
    elapsed = 0;
    previous = undefined;
    stage.replaceChildren();
    stage.hidden = true;
    toggle.disabled = false;
    resetButton.disabled = true;
    toggle.textContent = 'Start motion test';
    status.textContent = 'Stopped. No animation starts automatically.';
  }

  function animate(now: number) {
    if (!running || !avatar) return;
    if (previous !== undefined) elapsed += Math.max(0, Math.min(now - previous, 100)) / 1000;
    previous = now;
    avatar.renderMotionTest(elapsed);
    animation = requestAnimationFrame(animate);
  }

  toggle.addEventListener('click', async () => {
    if (running) { pause(); return; }
    const request = ++generation;
    toggle.disabled = true;
    resetButton.disabled = false;
    try {
      if (!avatar) {
        status.textContent = 'Preparing the synthetic motion test…';
        const { TimingAvatar } = await import('./timing-avatar');
        if (request !== generation) return;
        stage.hidden = false;
        avatar = new TimingAvatar(stage, 'motion-test');
        avatar.renderMotionTest(0);
      }
      if (document.hidden) {
        pause('Paused while the tab is hidden. Resume explicitly to continue the motion test.');
        return;
      }
      running = true;
      previous = undefined;
      toggle.textContent = 'Pause motion test';
      status.textContent = 'Running synthetic wrist turns and finger flexes — not sign language or a lesson translation.';
      animation = requestAnimationFrame(animate);
    } catch {
      if (request !== generation) return;
      reset();
      status.textContent = 'Motion test unavailable. Reload or try a WebGL-capable browser. Lesson and file review remain available.';
    } finally {
      if (request === generation) toggle.disabled = false;
    }
  });

  resetButton.addEventListener('click', reset);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) pause('Paused while the tab is hidden. Resume explicitly to continue the motion test.');
  });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
    if (event.matches && running) pause('Paused for reduced motion. Resume explicitly to continue the motion test.');
  });
  window.addEventListener('pagehide', reset);
  return { reset };
}
