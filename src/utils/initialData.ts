import { Employee, AttendanceRecord, HolidayRecord, CutoffPeriod } from '../types';

export const initialEmployees: Employee[] = [
  { id: 'emp-1', name: 'Martias', isActive: true },
  { id: 'emp-2', name: 'Dikta', isActive: true },
  { id: 'emp-3', name: 'Mira', isActive: true },
  { id: 'emp-4', name: 'Rida', isActive: true },
  { id: 'emp-5', name: 'Defi', isActive: true },
  { id: 'emp-6', name: 'Zetia', isActive: true },
  { id: 'emp-7', name: 'Evita', isActive: true },
];

export const initialCutoff: CutoffPeriod = {
  startDate: '2026-06-21',
  endDate: '2026-07-20',
  name: '21 Jun - 20 Jul',
};

// Custom historical database to populate initially (matching screenshot)
export function generateInitialAttendance(dates: string[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  dates.forEach(date => {
    const day = new Date(date).getDate();
    const month = new Date(date).getMonth() + 1; // 6 = June, 7 = July
    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;

    // Martias: Active all workdays, no absences
    records.push({
      employeeId: 'emp-1',
      date,
      status: isWeekend ? '' : 'M',
    });

    // Dikta: Active, has 1 C (Cuti) and 1 TM (Tidak Masuk)
    // In screenshot: 30-Jun is C, 22-Jun TM? Or similar
    let statusDikta: any = isWeekend ? '' : 'M';
    let notesDikta = '';
    if (!isWeekend) {
      if (day === 30 && month === 6) {
        statusDikta = 'C';
        notesDikta = 'Cuti Tahunan';
      } else if (day === 23 && month === 6) {
        statusDikta = 'TM';
        notesDikta = 'Tanpa Keterangan (Alpa)';
      }
    }
    records.push({
      employeeId: 'emp-2',
      date,
      status: statusDikta,
      notes: notesDikta,
    });

    // Mira: Active, 1 TM, 1 C
    let statusMira: any = isWeekend ? '' : 'M';
    let notesMira = '';
    if (!isWeekend) {
      if (day === 30 && month === 6) {
        statusMira = 'C';
        notesMira = 'Cuti Tahunan';
      } else if (day === 23 && month === 6) {
        statusMira = 'TM';
        notesMira = 'Keluarga Sakit tanpa lampiran';
      }
    }
    records.push({
      employeeId: 'emp-3',
      date,
      status: statusMira,
      notes: notesMira,
    });

    // Rida: Active all workdays, no absences
    records.push({
      employeeId: 'emp-4',
      date,
      status: isWeekend ? '' : 'M',
    });

    // Defi: 2 D (Dispensasi), 2 TM, 2 S (Sakit)
    let statusDefi: any = isWeekend ? '' : 'M';
    let notesDefi = '';
    if (!isWeekend) {
      if (day === 28 && month === 6) {
        statusDefi = 'D';
        notesDefi = 'Tugas luar kantor';
      } else if (day === 6 && month === 7) {
        statusDefi = 'S';
        notesDefi = 'Sakit Demam (Surat Dokter)';
      } else if (day === 7 && month === 7) {
        statusDefi = 'S';
        notesDefi = 'Istirahat Demam';
      } else if (day === 22 && month === 6 || day === 10 && month === 7) {
        statusDefi = 'TM';
        notesDefi = 'Alpa (Terlambat lapor)';
      } else if (day === 13 && month === 7) {
        statusDefi = 'D';
        notesDefi = 'Pelatihan Perusahaan';
      }
    }
    records.push({
      employeeId: 'emp-5',
      date,
      status: statusDefi,
      notes: notesDefi,
    });

    // Zetia: Joined late, blacked out (NA) from 21-Jun to 25-Jun
    const dateObj = new Date(date);
    let statusZetia: any = isWeekend ? '' : 'M';
    if (dateObj <= new Date('2026-06-25')) {
      statusZetia = 'NA';
    }
    records.push({
      employeeId: 'emp-6',
      date,
      status: statusZetia,
    });

    // Evita: Worked only 26-Jun to 9-Jul, others blacked out (NA)
    let statusEvita: any = isWeekend ? '' : 'M';
    if (dateObj <= new Date('2026-06-25') || dateObj >= new Date('2026-07-10')) {
      statusEvita = 'NA';
    }
    records.push({
      employeeId: 'emp-7',
      date,
      status: statusEvita,
    });
  });

  return records;
}

export const initialHolidays: HolidayRecord[] = [
  // Setup standard weekends as automated, but we can have custom public holidays
  { date: '2026-06-29', name: 'Tahun Baru Islam', isHoliday: true },
  { date: '2026-07-08', name: 'Libur Pilkada Lokal', isHoliday: true },
];
