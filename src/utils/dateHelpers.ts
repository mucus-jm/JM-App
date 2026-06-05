export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }

  // Prevent infinite loops in case dates are messed up
  const limitDate = new Date(start);
  limitDate.setDate(limitDate.getDate() + 45); // Max 45 days for cutoff safety

  const tempDate = new Date(start);
  while (tempDate <= end && tempDate <= limitDate) {
    const yyyy = tempDate.getFullYear();
    const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
    const dd = String(tempDate.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    tempDate.setDate(tempDate.getDate() + 1);
  }

  return dates;
}

export const INDONESIAN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
];

export const INDONESIAN_DAYS = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const monthIdx = d.getMonth();
  return `${day}-${INDONESIAN_MONTHS[monthIdx]}`;
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return INDONESIAN_DAYS[d.getDay()];
}

export function isStandardWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const dayIdx = d.getDay();
  return dayIdx === 0 || dayIdx === 6; // 0 = Sunday, 6 = Saturday
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dayName = getDayName(dateStr);
  const dateNum = d.getDate();
  const monthName = INDONESIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${dateNum} ${monthName} ${year}`;
}
