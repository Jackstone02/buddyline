/**
 * Formats a 24-hour time string (HH:MM) to 12-hour format (e.g. "11AM", "1:30PM").
 */
export const formatTime12 = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
};

/**
 * Formats a start/end time range (HH:MM) as "11AM – 12PM".
 */
export const formatTimeRange = (start: string, end: string): string =>
  `${formatTime12(start)} – ${formatTime12(end)}`;

/**
 * Formats an ISO datetime string as "Sat, Apr 14 · 10:00 AM".
 */
export const formatScheduledAt = (iso: string): string => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
};
