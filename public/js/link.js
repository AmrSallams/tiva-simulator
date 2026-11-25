// Connection between a screen and the simulation server.
// The room code comes from the page address, e.g. monitor.html?s=2 (default "1").

export const station = (new URLSearchParams(location.search).get('s') || '1').toUpperCase();

/**
 * Start receiving the live state. `onState` is called every simulated second
 * and after every action. Returns a `send(action)` function.
 */
export function connect(onState, onStatus = () => {}) {
  const events = new EventSource(`/api/events?s=${encodeURIComponent(station)}`);
  events.onmessage = (e) => onState(JSON.parse(e.data));
  events.onopen = () => onStatus(true);
  events.onerror = () => onStatus(false); // the browser reconnects by itself

  return async function send(action) {
    const res = await fetch(`/api/action?s=${encodeURIComponent(station)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!res.ok) console.warn('Action refused:', await res.text());
    return res.ok;
  };
}

/** Adds the room code to links so that navigation stays in the same station. */
export const withStation = (href) => `${href}?s=${encodeURIComponent(station)}`;
