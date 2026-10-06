// Navigation remains usable if the GPU or external graphics dependency is unavailable.
import('./immersive-cosmos.js?v=cinematic-v21.1').catch(error => {
  document.body.classList.add('scene-fallback');
  document.getElementById('space').dataset.scene='fallback';
  dispatchEvent(new Event('tem:scene-failed'));
  console.warn('Using the static deep-space view:', error.message);
});








