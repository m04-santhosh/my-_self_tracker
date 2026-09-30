export function formatDateIso(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTimeDisplay(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  if (timeStr.includes('T')) {
    const dt = new Date(timeStr);
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, totalMinutes % 1440);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatRupees(paise: number): string {
  const rupees = Math.round(paise / 100);
  const isNegative = rupees < 0;
  const absRupees = Math.abs(rupees);

  // Indian Number Format (e.g. 1,25,000)
  const str = absRupees.toString();
  let lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${isNegative ? '-' : ''}Rs ${formatted}`;
}

export function getGreeting(userName: string = 'Santhosh', currentHour?: number): string {
  const h = currentHour !== undefined ? currentHour : new Date().getHours();
  if (h < 12) {
    return `Good morning, ${userName}`;
  } else if (h < 17) {
    return `Good afternoon, ${userName}`;
  } else {
    return `Good evening, ${userName}`;
  }
}
