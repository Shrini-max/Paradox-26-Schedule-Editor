import { FestivalEvent } from './constants';

/**
 * Formats minutes from the start of the day into "HH:MM AM/PM".
 */
export function formatMinsToTime(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Generates an array of time strings for dropdowns (every 15 mins).
 */
export const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  return formatMinsToTime(i * 15);
});

/**
 * Normalizes time strings like "04:00pm", "10:00 AM", "7PM ONWARDS" 
 * into minutes from the start of the day.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  const cleanStr = timeStr.toLowerCase().trim();
  
  // Handle "7PM ONWARDS" or similar
  const singleTimeMatch = cleanStr.match(/(\d+)(?::(\d+))?\s*(am|pm)/);
  if (!singleTimeMatch) return 0;

  let hours = parseInt(singleTimeMatch[1]);
  const minutes = singleTimeMatch[2] ? parseInt(singleTimeMatch[2]) : 0;
  const ampm = singleTimeMatch[3];

  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Extracts start and end minutes from a time range string.
 */
export function getTimeRange(timeStr: string): { start: number; end: number } {
  const parts = timeStr.split(/ to | - | – /i);
  const startStr = parts[0];
  const endStr = parts[1] || '11:59pm'; // Default end if "onwards"

  return {
    start: parseTimeToMinutes(startStr),
    end: parseTimeToMinutes(endStr)
  };
}

/**
 * Detects conflicts between two events.
 * A conflict occurs if they are on the same day, at the same venue, and overlap in time.
 */
export function hasConflict(e1: FestivalEvent, e2: FestivalEvent): boolean {
  if (e1.id === e2.id) return false;
  if (e1.day.trim() !== e2.day.trim()) return false;
  if (e1.venue.trim() !== e2.venue.trim()) return false;
  
  // If venue is "Any Classroom", assume no conflict for now unless IDs match exactly?
  // User might want to ignore "Any Classroom" conflicts.
  if (e1.venue.toLowerCase().includes('any classroom')) return false;

  const r1 = getTimeRange(e1.time);
  const r2 = getTimeRange(e2.time);

  return (r1.start < r2.end && r1.end > r2.start);
}

/**
 * Checks all events for conflicts. Returns a list of event IDs that have conflicts.
 */
export function getConflictingEventIds(events: FestivalEvent[]): { locationConflicts: Set<string>, ceremonyViolations: Set<string> } {
  const locationConflicts = new Set<string>();
  const ceremonyViolations = new Set<string>();
  
  // Find opening ceremony
  const openingCeremony = events.find(e => e.name.toLowerCase().includes('opening ceremony'));
  let forbiddenRange: { start: number; end: number } | null = null;
  let ceremonyDay = '';

  if (openingCeremony) {
    const range = getTimeRange(openingCeremony.time);
    forbiddenRange = {
      start: range.start - 60, // 1 hr before
      end: range.end
    };
    ceremonyDay = openingCeremony.day.trim();
  }

  for (let i = 0; i < events.length; i++) {
    const e1 = events[i];

    // Check ceremony violation
    if (forbiddenRange && e1.day.trim() === ceremonyDay && e1.id !== openingCeremony?.id) {
      const r1 = getTimeRange(e1.time);
      if (r1.start < forbiddenRange.end && r1.end > forbiddenRange.start) {
        ceremonyViolations.add(e1.id);
      }
    }

    // Check location conflicts
    for (let j = i + 1; j < events.length; j++) {
      const e2 = events[j];
      if (hasConflict(e1, e2)) {
        locationConflicts.add(e1.id);
        locationConflicts.add(e2.id);
      }
    }
  }
  return { locationConflicts, ceremonyViolations };
}

/**
 * Downloads data as a CSV file.
 */
export function exportToCSV(events: FestivalEvent[]) {
  const headers = ['Day', 'Time', 'Category', 'Event', 'Venue', 'Description'];
  const rows = events.map(e => [
    e.day,
    e.time,
    e.category,
    e.name,
    e.venue,
    e.description
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'festival_schedule.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Simple CSV parser for the initial data
 */
export function parseInitialCSV(csv: string): FestivalEvent[] {
  const lines = csv.split('\n');
  const result: FestivalEvent[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Use a simple split but handle commas inside quotes if needed?
    // The provided data is simple, mostly comma separated
    // Using a regex to split by comma but ignore commas inside quotes
    const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
    // Actually, simple split is fine for the provided data as long as we fix it.
    // Let's use a more robust split.
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (parts.length >= 5) {
      result.push({
        id: crypto.randomUUID(),
        day: parts[0]?.trim() || '',
        time: parts[1]?.trim() || '',
        category: parts[2]?.trim() || '',
        name: parts[3]?.trim() || '',
        venue: parts[4]?.trim() || '',
        description: parts[5]?.trim() || '',
        updatedBy: 'initial-seed',
        updatedByEmail: 'initial@seed.com'
      });
    }
  }
  return result.sort((a,b) => {
    // Sort by Day then Time
    const dayA = parseInt(a.day.replace(/\D/g, '') || '0');
    const dayB = parseInt(b.day.replace(/\D/g, '') || '0');
    if (dayA !== dayB) return dayA - dayB;
    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
  });
}
