export type AttendanceStatus = 'M' | 'D' | 'TM' | 'I' | 'S' | 'C' | 'NA' | '';

export interface Employee {
  id: string;
  name: string;
  joinDate?: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface AttendanceRecord {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
}

export interface HolidayRecord {
  date: string; // YYYY-MM-DD
  name: string;
  isHoliday: boolean;
}

export interface CutoffPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  name: string; // e.g., "21 Jun - 20 Jul"
}

export interface SheetsConfig {
  webAppUrl: string;
  spreadsheetUrl: string;
  lastSyncedAt?: string;
  isConnected: boolean;
}
