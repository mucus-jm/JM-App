/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  Calendar,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Employee, AttendanceRecord, HolidayRecord, CutoffPeriod, SheetsConfig, AttendanceStatus } from './types';
import { getDatesInRange } from './utils/dateHelpers';
import {
  initialEmployees,
  initialCutoff,
  generateInitialAttendance,
  initialHolidays
} from './utils/initialData';

// Component imports
import AttendanceTable from './components/AttendanceTable';
import PeriodConfigurator from './components/PeriodConfigurator';
import EmployeeManagement from './components/EmployeeManagement';
import SheetsSyncPanel from './components/SheetsSyncPanel';
import ExportRecap from './components/ExportRecap';

export default function App() {
  // --- STATE LAYER & LOCALSTORAGE INITIALIZATION ---
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('absensi_employees');
    return saved ? JSON.parse(saved) : initialEmployees;
  });

  const [cutoff, setCutoff] = useState<CutoffPeriod>(() => {
    const saved = localStorage.getItem('absensi_cutoff');
    return saved ? JSON.parse(saved) : initialCutoff;
  });

  const [dates, setDates] = useState<string[]>(() => {
    return getDatesInRange(initialCutoff.startDate, initialCutoff.endDate);
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('absensi_attendance');
    if (saved) return JSON.parse(saved);
    // Otherwise fallback to prefilled values
    const generatedDates = getDatesInRange(initialCutoff.startDate, initialCutoff.endDate);
    return generateInitialAttendance(generatedDates);
  });

  const [holidays, setHolidays] = useState<HolidayRecord[]>(() => {
    const saved = localStorage.getItem('absensi_holidays');
    return saved ? JSON.parse(saved) : initialHolidays;
  });

  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig>(() => {
    const saved = localStorage.getItem('absensi_sheets_config');
    return saved
      ? JSON.parse(saved)
      : { webAppUrl: '', spreadsheetUrl: '', isConnected: false };
  });

  // Keep track of syncing progress
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // --- STATE SYNC PERSISTENCE EFFECTS ---
  useEffect(() => {
    localStorage.setItem('absensi_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('absensi_cutoff', JSON.stringify(cutoff));
    const computedDates = getDatesInRange(cutoff.startDate, cutoff.endDate);
    setDates(computedDates);
  }, [cutoff]);

  useEffect(() => {
    localStorage.setItem('absensi_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('absensi_holidays', JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => {
    localStorage.setItem('absensi_sheets_config', JSON.stringify(sheetsConfig));
  }, [sheetsConfig]);

  // Fill in empty records when dates or employees change
  useEffect(() => {
    if (dates.length === 0 || employees.length === 0) return;

    setAttendance(prev => {
      let changed = false;
      const updated = [...prev];

      employees.forEach(emp => {
        dates.forEach(d => {
          const index = updated.findIndex(r => r.employeeId === emp.id && r.date === d);
          if (index === -1) {
            updated.push({
              employeeId: emp.id,
              date: d,
              status: '',
            });
            changed = true;
          }
        });
      });

      return changed ? updated : prev;
    });
  }, [dates, employees]);

  // --- ACTIONS & CALCULATION LAYER ---

  // Handle single attendance cell modification
  const handleUpdateRecord = (
    empId: string,
    date: string,
    status: AttendanceStatus,
    notes?: string
  ) => {
    const updated = attendance.map(r => {
      if (r.employeeId === empId && r.date === date) {
        return { ...r, status, notes: notes || undefined };
      }
      return r;
    });

    setAttendance(updated);

    // Dynamic background save to Google Sheets if connected
    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      triggerBackgroundSheetsSync(updated, employees, dates, holidays, cutoff.name);
    }
  };

  // Toggle/Set Holiday status of a date explicitly
  const handleToggleHoliday = (date: string, isHoliday: boolean, name?: string) => {
    let updated: HolidayRecord[] = [];
    const existingIdx = holidays.findIndex(h => h.date === date);

    if (isHoliday) {
      if (existingIdx > -1) {
        updated = holidays.map((h, i) =>
          i === existingIdx ? { ...h, isHoliday: true, name: name || 'Hari Libur' } : h
        );
      } else {
        updated = [...holidays, { date, isHoliday: true, name: name || 'Hari Libur' }];
      }
    } else {
      // Remove custom holiday designation (make it standard workday / standard weekend)
      updated = holidays.filter(h => h.date !== date);
    }

    setHolidays(updated);

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      triggerBackgroundSheetsSync(attendance, employees, dates, updated, cutoff.name);
    }
  };

  // Add Employee
  const handleAddEmployee = (name: string, joinDate?: string) => {
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name,
      joinDate,
      isActive: true,
    };
    const updatedEmployees = [...employees, newEmp];
    setEmployees(updatedEmployees);

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      triggerBackgroundSheetsSync(attendance, updatedEmployees, dates, holidays, cutoff.name);
    }
  };

  // Edit Employee Info
  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const updatedEmployees = employees.map(e => (e.id === updatedEmp.id ? updatedEmp : e));
    setEmployees(updatedEmployees);

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      triggerBackgroundSheetsSync(attendance, updatedEmployees, dates, holidays, cutoff.name);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = (id: string) => {
    const updatedEmployees = employees.filter(e => e.id !== id);
    setEmployees(updatedEmployees);

    // Also prune attendance records
    const updatedAttendance = attendance.filter(r => r.employeeId !== id);
    setAttendance(updatedAttendance);

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      triggerBackgroundSheetsSync(updatedAttendance, updatedEmployees, dates, holidays, cutoff.name);
    }
  };

  // Reset local database back to default initial dataset
  const handleResetDatabase = () => {
    const isConfirmed = window.confirm(
      'Apakah Anda ingin mereset seluruh data absensi ini kembali ke contoh data awal? Perubahan saat ini akan hilang!'
    );
    if (isConfirmed) {
      setEmployees(initialEmployees);
      setCutoff(initialCutoff);
      setHolidays(initialHolidays);
      setAttendance(generateInitialAttendance(getDatesInRange(initialCutoff.startDate, initialCutoff.endDate)));
      setSheetsConfig({ webAppUrl: '', spreadsheetUrl: '', isConnected: false });
      alert('Database absensi berhasil di-reset.');
    }
  };

  // Silent automatic background post to sheets webapp
  const triggerBackgroundSheetsSync = async (
    currAttendance: AttendanceRecord[],
    currEmployees: Employee[],
    currDates: string[],
    currHolidays: HolidayRecord[],
    currPeriodName: string
  ) => {
    if (!sheetsConfig.webAppUrl || !sheetsConfig.isConnected) return;

    try {
      const holidaysMap: Record<string, boolean> = {};
      currHolidays.forEach(h => {
        if (h.isHoliday) holidaysMap[h.date] = true;
      });

      await fetch(sheetsConfig.webAppUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          operation: 'sync',
          employees: currEmployees,
          dates: currDates,
          attendance: currAttendance,
          holidaysMap,
          periodName: currPeriodName,
        }),
      });
      // Silent success
    } catch (e) {
      console.warn('Auto background sync failed, user must sync manually using panel.', e);
    }
  };

  // Force full manual sync
  const handleManualSync = async () => {
    if (!sheetsConfig.webAppUrl) {
      alert('Harap hubungkan Google Sheet Anda terlebih dahulu melalui panel Integrasi Google Sheets di bawah.');
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Menyinkronkan total data ke Google Sheets...');

    try {
      const holidaysMap: Record<string, boolean> = {};
      holidays.forEach(h => {
        if (h.isHoliday) holidaysMap[h.date] = true;
      });

      const response = await fetch(sheetsConfig.webAppUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          operation: 'sync',
          employees,
          dates,
          attendance,
          holidaysMap,
          periodName: cutoff.name,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSheetsConfig(prev => ({
          ...prev,
          isConnected: true,
          lastSyncedAt: new Date().toLocaleString('id-ID'),
        }));
        setSyncMessage('Sinkronisasi Berhasil!');
      } else {
        alert(`Gagal sinkron: ${result.message}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal menyinkronkan data. Mohon pastikan deployment webapp Google Sheets Anda aktif.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

  // Calculate generic period workdays (excluding weekend & custom holidays)
  const calculateWorkdaysCount = () => {
    return dates.filter(date => {
      const isWk = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
      const customHol = holidays.some(h => h.date === date && h.isHoliday);
      return !isWk && !customHol;
    }).length;
  };

  const calculateHolidaysCount = () => {
    return dates.filter(date => {
      const isWk = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
      const customHol = holidays.some(h => h.date === date && h.isHoliday);
      return isWk || customHol;
    }).length;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* 1. TOP HEADER / BRAND BAR */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#e0f9fa] text-[#2ba0af] rounded-xl font-black text-2xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 shrink-0" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                Aplikasi Absensi Karyawan Sederhana
              </h1>
              <p className="text-xs text-gray-400">
                Pengelolaan kehadiran & rekapan cut-off gajian real-time terhubung Google Sheets
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sheetsConfig.isConnected ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5 rounded-lg font-semibold">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span>Terhubung ke Google Sheets</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-3 py-1.5 rounded-lg font-semibold">
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-full"></span>
                <span>Mode Offline Lokal</span>
              </div>
            )}

            {sheetsConfig.isConnected && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="bg-[#2ba0af] hover:bg-[#208491] disabled:bg-gray-300 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{syncMessage || 'Sinkronkan Sekarang'}</span>
              </button>
            )}

            <button
              onClick={handleResetDatabase}
              className="text-gray-400 hover:text-slate-600 hover:bg-slate-100 text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer"
              title="Reset data ke default"
            >
              Reset Data
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN BENTO CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Statistics Banner Cards */}
        <section id="stats_overview" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Total Karyawan</span>
              <span className="text-xl font-bold text-slate-800">{employees.length} Orang</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Hari Kerja Dinilai</span>
              <span className="text-xl font-bold text-slate-800">{calculateWorkdaysCount()} Hari</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Sabtu, Minggu & Libur</span>
              <span className="text-xl font-bold text-slate-800">{calculateHolidaysCount()} Hari</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Database Sync</span>
              <span className="text-xl font-bold text-slate-800">{sheetsConfig.isConnected ? 'Aktif' : 'Non-aktif'}</span>
            </div>
          </div>
        </section>

        {/* --- MAIN CENTERPIECE: SPREADSHEET GRID --- */}
        <section id="attendance_main_grid" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
                Lembar Input Grid Absensi Karyawan
              </h2>
              <p className="text-xs text-gray-400">
                Klik pada sel tanggal untuk mengisi absensi (M/D/TM/I/S/C) atau memberi catatan. Klik header tanggal untuk menyetel hari Libur.
              </p>
            </div>
          </div>

          <AttendanceTable
            employees={employees}
            dates={dates}
            attendance={attendance}
            holidays={holidays}
            onUpdateRecord={handleUpdateRecord}
            onToggleHoliday={handleToggleHoliday}
            periodName={cutoff.name}
          />
        </section>

        {/* --- BOTTOM SECTION: DATA SETUPS, SYNC & EXPORTS (SIBLING CONTROLS) --- */}
        <section id="developer_actions_panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-3">
          
          {/* Left Column: Management & Configurations */}
          <div className="lg:col-span-4 space-y-6">
            <PeriodConfigurator cutoff={cutoff} onUpdateCutoff={setCutoff} />
            <EmployeeManagement
              employees={employees}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
            />
          </div>

          {/* Right Column: Google Sheets Integrator & Exports */}
          <div className="lg:col-span-8 space-y-6">
            <SheetsSyncPanel
              config={sheetsConfig}
              onUpdateConfig={(conf) => setSheetsConfig(prev => ({ ...prev, ...conf }))}
              employees={employees}
              dates={dates}
              attendance={attendance}
              holidays={holidays}
              periodName={cutoff.name}
            />
            <ExportRecap
              employees={employees}
              dates={dates}
              attendance={attendance}
              holidays={holidays}
              periodName={cutoff.name}
            />
          </div>

        </section>

      </main>

      {/* 3. SUBTLE FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-6">
          <p>© {new Date().getFullYear()} Aplikasi Absensi Karyawan Sederhana • Desain bento-grid premium, dirancang khusus untuk HRD.</p>
        </div>
      </footer>

    </div>
  );
}
