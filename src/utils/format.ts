const LABEL_MAP: Record<string, string> = {
  fun_dive: 'Fun Dive', line_training: 'Line Training', pool: 'Pool',
  dynamic: 'Dynamic', static: 'Static', spearfishing: 'Spearfishing', other: 'Other',
  open_water: 'Open Water', theory: 'Theory',
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
  static_apnea: 'Static Apnea', dynamic_apnea: 'Dynamic Apnea', free_immersion: 'Free Immersion',
  constant_weight: 'Constant Weight', variable_weight: 'Variable Weight', no_limits: 'No Limits',
  freediver: 'Freediver', advanced_freediver: 'Advanced Freediver',
  master_freediver: 'Master Freediver', instructor: 'Instructor',
};

export const formatLabel = (value: string): string => {
  if (!value) return '';
  if (LABEL_MAP[value]) return LABEL_MAP[value];
  return value.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const formatTime12 = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
};

export const formatTimeRange = (start: string, end: string): string =>
  `${formatTime12(start)} – ${formatTime12(end)}`;

export const formatScheduledAt = (iso: string): string => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
};
