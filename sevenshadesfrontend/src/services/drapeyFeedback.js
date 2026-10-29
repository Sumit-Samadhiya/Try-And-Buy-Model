// Keep feedback local; never send entered credentials or addresses to the mascot.
export function drapeyFeedback(message, tone = 'info') {
  if (typeof message !== 'string' || !message.trim()) return;
  window.dispatchEvent(new CustomEvent('drapey-feedback', { detail: { message: message.slice(0, 220), tone } }));
}
