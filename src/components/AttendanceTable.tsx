import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Sparkles, MessageSquare, Plus, ArrowRight, ShieldAlert, Calendar, Zap, Check, CheckSquare, Trash2 } from 'lucide-react';
import { Employee, AttendanceRecord, HolidayRecord, AttendanceStatus } from '../types';
import { formatDateLabel, getDayName, isStandardWeekend } from '../utils/dateHelpers';

interface AttendanceTableProps {
  employees: Employee[];
  dates: string[];
  attendance: AttendanceRecord[];
  holidays: HolidayRecord[];
  onUpdateRecord: (empId: string, date: string, status: AttendanceStatus, notes?: string) => void;
  onUpdateRecordBulk: (
    updates: { employeeId: string; date: string; status: AttendanceStatus; notes?: string }[]
  ) => void;
  onToggleHoliday: (date: string, isHoliday: boolean, name?: string) => void;
  periodName: string;
}

export default function AttendanceTable({
  employees,
  dates,
  attendance,
  holidays,
  onUpdateRecord,
  onUpdateRecordBulk,
  onToggleHoliday,
  periodName,
}: AttendanceTableProps) {
  // Popover State
  const [activePopover, setActivePopover] = useState<{
    empId: string;
    date: string;
    clientX: number;
    clientY: number;
  } | null>(null);

  const [notesInput, setNotesInput] = useState('');
  const [statusInput, setStatusInput] = useState<AttendanceStatus>('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Holiday Popover State
  const [activeHolidayPopover, setActiveHolidayPopover] = useState<{
    date: string;
    clientX: number;
    clientY: number;
  } | null>(null);

  const [holidayNameInput, setHolidayNameInput] = useState('');
  const [isHolidayInput, setIsHolidayInput] = useState(false);
  const holidayPopoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
      if (holidayPopoverRef.current && !holidayPopoverRef.current.contains(event.target as Node)) {
        setActiveHolidayPopover(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- BULK OPERATIONS STATE & LOGIC ---
  const [isBulkPanelOpen, setIsBulkPanelOpen] = useState(false);
  const [bulkEmployeeScope, setBulkEmployeeScope] = useState<'all' | string>('all');
  const [bulkDateScope, setBulkDateScope] = useState<'workdays' | 'all-dates' | string>('workdays');
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('M');
  const [bulkNotes, setBulkNotes] = useState('');

  // Helper check if date is holiday
  const getHolidayInfo = (dateStr: string) => {
    const isWk = isStandardWeekend(dateStr);
    const customHoliday = holidays.find(h => h.date === dateStr);

    if (customHoliday) {
      return {
        isHoliday: customHoliday.isHoliday,
        name: customHoliday.name || 'Hari Libur',
      };
    }

    return {
      isHoliday: isWk,
      name: isWk ? 'Weekend' : '',
    };
  };

  // Status mapping details
  const STATUS_CONFIG: Record<AttendanceStatus, { bg: string; text: string; label: string; desc: string }> = {
    'M': { bg: 'bg-emerald-100/70', text: 'text-emerald-700 font-semibold', label: 'M', desc: 'Masuk Kerja' },
    'D': { bg: 'bg-amber-100', text: 'text-amber-800 font-semibold', label: 'D', desc: 'Dispensasi (Dinas Luar)' },
    'TM': { bg: 'bg-rose-100', text: 'text-rose-700 font-semibold', label: 'TM', desc: 'Tanpa Keterangan (Alpa)' },
    'I': { bg: 'bg-sky-100', text: 'text-sky-700 font-semibold', label: 'I', desc: 'Izin Resmi' },
    'S': { bg: 'bg-indigo-100', text: 'text-indigo-700 font-semibold', label: 'S', desc: 'Sakit (Surat Dokter)' },
    'C': { bg: 'bg-purple-100', text: 'text-purple-700 font-semibold', label: 'C', desc: 'Cuti Tahunan / Bersama' },
    'NA': { bg: 'bg-[#111111]', text: 'text-gray-400', label: '', desc: 'Belum Aktif (Periode Kerja)' },
    '': { bg: 'bg-gray-50/50', text: 'text-gray-300', label: '', desc: 'Kosong' }
  };

  // Compute Count summary for an employee
  const getEmployeeCount = (empId: string, status: AttendanceStatus) => {
    return attendance.filter(r => {
      if (r.employeeId !== empId || r.status !== status) return false;
      // Skip weekend/holiday dates when counting stats unless requested, 
      // but in the screenshot, M represents the count of active days worked.
      const hol = getHolidayInfo(r.date);
      return !hol.isHoliday;
    }).length;
  };

  // Open popover click
  const handleCellClick = (empId: string, date: string, e: React.MouseEvent) => {
    const record = attendance.find(r => r.employeeId === empId && r.date === date);
    setStatusInput(record ? record.status : '');
    setNotesInput(record && record.notes ? record.notes : '');

    // Get viewport coordinates for floating popup positioning
    setActivePopover({
      empId,
      date,
      clientX: Math.min(e.clientX, window.innerWidth - 300),
      clientY: Math.min(e.clientY, window.innerHeight - 320),
    });
  };

  const handleSave = () => {
    if (!activePopover) return;
    onUpdateRecord(activePopover.empId, activePopover.date, statusInput, notesInput);
    setActivePopover(null);
  };

  // Quick header click to trigger inline custom holiday editor
  const handleHeaderClick = (dateStr: string, e: React.MouseEvent) => {
    const hol = getHolidayInfo(dateStr);
    setIsHolidayInput(!!hol?.isHoliday);
    setHolidayNameInput(hol?.isHoliday ? (hol.name === 'Weekend' ? '' : hol.name) : '');

    const x = e ? e.clientX : 200;
    const y = e ? e.clientY : 200;

    setActiveHolidayPopover({
      date: dateStr,
      clientX: Math.max(10, Math.min(x, window.innerWidth - 320)),
      clientY: Math.max(10, Math.min(y, window.innerHeight - 300)),
    });
  };

  const handleSaveHoliday = () => {
    if (!activeHolidayPopover) return;
    onToggleHoliday(activeHolidayPopover.date, isHolidayInput, holidayNameInput || undefined);
    setActiveHolidayPopover(null);
  };

  // Handler for custom bulk updates
  const handleApplyBulkUpdate = () => {
    const targetEmployees = bulkEmployeeScope === 'all' 
      ? employees 
      : employees.filter(e => e.id === bulkEmployeeScope);

    if (targetEmployees.length === 0) {
      alert('Pilih karyawan terlebih dahulu.');
      return;
    }

    let targetDates: string[] = [];
    if (bulkDateScope === 'workdays') {
      targetDates = dates.filter(d => {
        const hol = getHolidayInfo(d);
        return !hol?.isHoliday;
      });
    } else if (bulkDateScope === 'all-dates') {
      targetDates = dates;
    } else {
      targetDates = [bulkDateScope];
    }

    if (targetDates.length === 0) {
      alert('Tentukan tanggal target update.');
      return;
    }

    const isConfirmed = window.confirm(
      `Sistem akan mengubah status kehadiran untuk:\n` +
      `- Karyawan: ${bulkEmployeeScope === 'all' ? 'Semua Karyawan' : employees.find(e => e.id === bulkEmployeeScope)?.name}\n` +
      `- Tanggal: ${bulkDateScope === 'workdays' ? 'Semua Hari Kerja' : bulkDateScope === 'all-dates' ? 'Semua Hari (termasuk Weekend)' : bulkDateScope}\n` +
      `- Status Baru: ${STATUS_CONFIG[bulkStatus]?.desc || 'Kosong / Clear'} (${bulkStatus || 'CLEAR'})\n\n` +
      `Apakah Anda yakin ingin menerapkan perubahan secara massal?`
    );

    if (!isConfirmed) return;

    const updates: { employeeId: string; date: string; status: AttendanceStatus; notes?: string }[] = [];
    targetEmployees.forEach(emp => {
      targetDates.forEach(date => {
        updates.push({
          employeeId: emp.id,
          date,
          status: bulkStatus,
          notes: bulkNotes || undefined
        });
      });
    });

    onUpdateRecordBulk(updates);
    setBulkNotes('');
    alert(`Berhasil meng-update ${updates.length} records absensi secara massal.`);
  };

  // Magic auto-filler for empty workdays
  const handleAutoFillWorkdaysPresent = () => {
    const targetDates = dates.filter(d => {
      const hol = getHolidayInfo(d);
      return !hol?.isHoliday;
    });

    const updates: { employeeId: string; date: string; status: AttendanceStatus }[] = [];
    
    employees.forEach(emp => {
      targetDates.forEach(date => {
        const record = attendance.find(r => r.employeeId === emp.id && r.date === date);
        if (!record || !record.status) {
          updates.push({
            employeeId: emp.id,
            date,
            status: 'M',
          });
        }
      });
    });

    if (updates.length === 0) {
      alert('Semua hari kerja untuk seluruh karyawan sudah terisi (tidak ada sel kosong).');
      return;
    }

    const isConfirmed = window.confirm(
      `🪄 Auto-Isi Kehadiran:\n` +
      `Sistem mendeteksi ada ${updates.length} sel absen hari kerja yang masih kosong.\n` +
      `Apakah Anda ingin mengisi otomatis seluruh sel kosong ini dengan status "M" (Masuk Kerja)?`
    );

    if (!isConfirmed) return;

    onUpdateRecordBulk(updates);
    alert(`Berhasil mengisi ${updates.length} sel kosong hari kerja dengan status 'M' secara otomatis.`);
  };

  // Clear all attendance record in the grid completely
  const handleClearAllAttendance = () => {
    const isConfirmed = window.confirm(
      '⚠️ PERINGATAN KOSONGKAN SEMENTARA:\n' +
      'Apakah Anda benar-benar yakin ingin mengosongkan SELURUH data kehadiran untuk semua karyawan di periode ini?\n' +
      'Tindakan ini akan menghapus semua status kehadiran terisi pada grid ini.'
    );

    if (!isConfirmed) return;

    const updates: { employeeId: string; date: string; status: AttendanceStatus }[] = [];
    employees.forEach(emp => {
      dates.forEach(date => {
        updates.push({
          employeeId: emp.id,
          date,
          status: '',
        });
      });
    });

    onUpdateRecordBulk(updates);
    alert('Seluruh data kehadiran pada periode ini berhasil dikosongkan!');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Top Legend Bar */}
      <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex flex-wrap gap-4 items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">Periode Gaji:</span>
          <span className="bg-[#e0f9fa] text-[#2ba0af] font-bold px-2.5 py-1 rounded">
            {periodName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-gray-400">Keterangan Singkat:</span>
          {Object.entries(STATUS_CONFIG).map(([key, item]) => {
            if (!key || key === 'NA') return null;
            return (
              <div key={key} className="flex items-center gap-1">
                <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${item.bg} ${item.text}`}>
                  {item.label || '-'}
                </span>
                <span className="text-gray-500 text-[11px] font-medium">{item.desc}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 bg-[#111111] rounded"></span>
            <span className="text-gray-500 text-[11px]">Belum Bekerja</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 bg-slate-200 rounded border border-dashed border-gray-300"></span>
            <span className="text-gray-500 text-[11px]">Hari Libur</span>
          </div>
        </div>
      </div>

      {/* Quick Toolbar Row */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBulkPanelOpen(!isBulkPanelOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer select-none ${
              isBulkPanelOpen
                ? 'bg-[#e0f9fa]/80 border-[#3bc3d1] text-[#2ba0af]'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isBulkPanelOpen ? 'fill-[#2ba0af]' : ''}`} />
            <span>⚡ Grup / Input Massal</span>
          </button>

          <button
            type="button"
            onClick={handleAutoFillWorkdaysPresent}
            className="flex items-center gap-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 border border-teal-200 text-emerald-800 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none"
            title="Satu klik untuk mengisi semua sel hari kerja yang kosong dengan status 'M'"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
            <span>🪄 Auto-Isi Semua Hari Kerja ('M')</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllAttendance}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none"
            title="Kosongkan seluruh data kehadiran pada tabel periode ini"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>📋 Kosongkan Seluruh Absensi</span>
          </button>
        </div>

        <div className="text-[11px] text-gray-400 italic">
          💡 Tips: Klik header kolom tanggal untuk mengubah/menset Hari Libur.
        </div>
      </div>

      {/* Custom Bulk Update Form Card */}
      {isBulkPanelOpen && (
        <div className="bg-[#f8fafc] border-b border-slate-200/80 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Zap className="w-4 h-4 text-[#2ba0af] fill-[#2ba0af]" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Panel Pengisian Massal Absensi Karyawan
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* 1. Employee Scope */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase" htmlFor="bulk_employee_select">
                1. Pilih Karyawan
              </label>
              <select
                id="bulk_employee_select"
                value={bulkEmployeeScope}
                onChange={(e) => setBulkEmployeeScope(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#3bc3d1] cursor-pointer"
              >
                <option value="all">👥 Semua Karyawan ({employees.length} orang)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>👤 {emp.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Date Scope */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase" htmlFor="bulk_date_select">
                2. Pilih Waktu / Tanggal
              </label>
              <select
                id="bulk_date_select"
                value={bulkDateScope}
                onChange={(e) => setBulkDateScope(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#3bc3d1] cursor-pointer"
              >
                <option value="workdays">💼 Semua Hari Kerja (Kecuali Sabtu, Minggu & Libur)</option>
                <option value="all-dates">📅 Seluruh Hari Kalender (Termasuk Hari Libur)</option>
                <optgroup label="Tanggal Spesifik">
                  {dates.map(date => {
                    const dayName = getDayName(date);
                    const formatted = date.split('-').reverse().join('/');
                    return (
                      <option key={date} value={date}>
                        {formatted} ({dayName})
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>

            {/* 3. Status selection */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase">
                3. Kehadiran / Kosongkan
              </label>
              <div className="flex flex-wrap gap-1 bg-white p-1 border border-slate-200 rounded-lg">
                {(['M', 'D', 'TM', 'I', 'S', 'C', ''] as AttendanceStatus[]).map(status => {
                  const config = STATUS_CONFIG[status];
                  const isSelected = bulkStatus === status;
                  return (
                    <button
                      key={status || 'clear'}
                      type="button"
                      onClick={() => setBulkStatus(status)}
                      title={config?.desc || 'Kosongkan / Bersihkan'}
                      className={`flex-1 h-7 rounded text-[11px] font-bold transition flex items-center justify-center cursor-pointer ${
                        isSelected 
                          ? `${config?.bg || 'bg-slate-100'} ${config?.text || 'text-slate-600'} ring-1 ring-offset-0 ring-[#2ba0af]` 
                          : 'bg-transparent text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {status || 'CLEAR'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Action button & Notes */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase" htmlFor="bulk_notes_input">
                  Catatan (Opsional)
                </label>
                <input
                  id="bulk_notes_input"
                  type="text"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Contoh: Sakit Flu, Dispensasi"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyBulkUpdate}
                className="bg-[#2ba0af] hover:bg-[#208491] hover:shadow text-white text-xs px-4 py-2 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer h-9 shrink-0 self-end"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Terapkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Combined Grid Container */}
      <div id="attendance_grid_wrapper" className="flex flex-1 overflow-auto max-h-[500px]">
        {/* LEFT BLOCK: Static Columns (Nama, M, D, TM, I, S, C) */}
        <div className="sticky left-0 bg-white z-20 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.06)] flex-shrink-0">
          <table className="border-collapse">
            <thead>
              <tr className="h-12 bg-gray-50">
                <th className="border-b border-r border-gray-200 text-[#2ca0af] font-bold text-xs uppercase px-4 text-left w-52 bg-[#e0fdfa]">
                  Nama Karyawan
                </th>
                {['M', 'D', 'TM', 'I', 'S', 'C'].map(status => (
                  <th
                    key={status}
                    className="border-b border-r border-gray-200 text-amber-800 font-extrabold text-[11px] w-10 text-center bg-[#fef3c7]"
                    title={STATUS_CONFIG[status as AttendanceStatus]?.desc}
                  >
                    {status}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="h-10 border-b border-gray-100 hover:bg-slate-50 transition">
                  <td className="border-r border-gray-200 font-semibold text-gray-700 text-xs px-4">
                    {emp.name}
                  </td>
                  {(['M', 'D', 'TM', 'I', 'S', 'C'] as AttendanceStatus[]).map(status => {
                    const count = getEmployeeCount(emp.id, status);
                    return (
                      <td
                        key={status}
                        className="border-r border-gray-200 text-center text-xs font-bold text-slate-700 bg-[#fffbeb]/30"
                      >
                        {count > 0 ? count : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT BLOCK: Scrollable Date Columns */}
        <div className="flex-1 overflow-x-auto min-w-[500px]">
          <table className="border-collapse w-full table-fixed">
            <thead>
              <tr className="h-12">
                {dates.map(date => {
                  const hol = getHolidayInfo(date);
                  const label = formatDateLabel(date);
                  const dName = getDayName(date);

                  return (
                    <th
                      key={date}
                      onClick={(e) => handleHeaderClick(date, e)}
                      className={`border-b border-r border-gray-200 text-center text-[10px] w-11 h-12 select-none cursor-pointer hover:opacity-90 transition relative ${
                        hol.isHoliday
                          ? 'bg-rose-500 text-white font-bold'
                          : 'bg-[#3bc3d1] text-white font-semibold'
                      }`}
                      title={`${dName} - ${hol.isHoliday ? hol.name : 'Hari Kerja'}`}
                    >
                      <div className="leading-tight">{label.split('-')[0]}</div>
                      <div className="text-[8px] opacity-90">{label.split('-')[1]}</div>
                      {hol.isHoliday && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="h-10 border-b border-gray-100 hover:bg-slate-50 transition">
                  {dates.map(date => {
                    const record = attendance.find(r => r.employeeId === emp.id && r.date === date);
                    const status = record ? record.status : '';
                    const notes = record ? record.notes : '';
                    const hol = getHolidayInfo(date);

                    // Cell content and styling
                    let cellBg = 'bg-white';
                    let cellText = 'text-gray-700';

                    if (hol.isHoliday) {
                      cellBg = 'bg-slate-100/80';
                    } else if (status && STATUS_CONFIG[status]) {
                      cellBg = STATUS_CONFIG[status].bg;
                      cellText = STATUS_CONFIG[status].text;
                    }

                    return (
                      <td
                        key={date}
                        onClick={(e) => handleCellClick(emp.id, date, e)}
                        className={`border-r border-gray-200 text-center text-[11px] font-bold cursor-pointer relative group select-none hover:bg-indigo-50/50 transition truncate-ellipsis w-11 h-10 ${cellBg} ${cellText}`}
                      >
                        {status === 'NA' ? (
                          <div className="absolute inset-0 bg-[#1e293b]" />
                        ) : (
                          status
                        )}

                        {/* Triangled Indicator in bottom right corner if comments are present, exactly like Microsoft Excel */}
                        {notes && (
                          <div className="absolute bottom-0 right-0 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-rose-600" title={notes} />
                        )}

                        {/* Quick Hover Tooltip for notes details */}
                        {notes && (
                          <div className="absolute hidden group-hover:block z-30 bottom-full left-1/2 -translate-x-1/2 mb-1 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap leading-snug">
                            <div className="font-semibold text-[#3bc3d1] border-b border-slate-700 pb-0.5 mb-0.5 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> Catatan HRD
                            </div>
                            {notes}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Popover Editor Dialog */}
      {activePopover && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            left: `${activePopover.clientX}px`,
            top: `${activePopover.clientY}px`,
          }}
          className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 w-72 space-y-4 animate-in fade-in zoom-in duration-100"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div className="text-left">
              <span className="font-bold text-gray-800 text-xs block">
                {employees.find(e => e.id === activePopover.empId)?.name}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Tanggal: {activePopover.date.split('-').reverse().join('/')}
              </span>
            </div>
            {getHolidayInfo(activePopover.date).isHoliday && (
              <span className="bg-rose-50 text-rose-600 font-bold text-[9px] px-1.5 py-0.5 rounded">
                Hari Libur
              </span>
            )}
          </div>

          {/* Status Selection Buttons */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1.5 text-left">
              Status Absensi (Klik langsung simpan)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['M', 'D', 'TM', 'I', 'S', 'C'] as AttendanceStatus[]).map(st => {
                const conf = STATUS_CONFIG[st];
                const isSelected = statusInput === st;

                return (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusInput(st);
                      onUpdateRecord(activePopover.empId, activePopover.date, st, notesInput);
                      setActivePopover(null);
                    }}
                    className={`h-9 flex flex-col items-center justify-center rounded-lg text-xs font-black border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#3bc3d1] bg-[#e0f9fa]/60 text-[#2ba0af] scale-105'
                        : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                    title={conf?.desc}
                  >
                    <span>{st}</span>
                    <span className="text-[8px] font-normal opacity-70 scale-90">{st === 'M' ? 'Masuk' : st === 'D' ? 'Disp' : st === 'TM' ? 'Alpa' : st === 'I' ? 'Izin' : st === 'S' ? 'Sakit' : 'Cuti'}</span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setStatusInput('NA');
                  onUpdateRecord(activePopover.empId, activePopover.date, 'NA', notesInput);
                  setActivePopover(null);
                }}
                className={`h-9 border text-xs font-semibold rounded-lg flex items-center justify-center cursor-pointer ${
                  statusInput === 'NA' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                title="Sembunyikan/Blackout dari kalender (Belum Bekerja)"
              >
                Blackout
              </button>
              <button
                onClick={() => {
                  setStatusInput('');
                  onUpdateRecord(activePopover.empId, activePopover.date, '', notesInput);
                  setActivePopover(null);
                }}
                className={`h-9 border text-xs font-semibold rounded-lg flex items-center justify-center cursor-pointer ${
                  statusInput === '' ? 'border-[#312521] bg-[#ececec] text-slate-500' : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-400'
                }`}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Absence notes input */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1 text-left" htmlFor="popover_notes_input">
              Catatan / Alasan Tidak Masuk
            </label>
            <textarea
              id="popover_notes_input"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Contoh: Sakit flu, tugas dinas, cuti penting"
              className="w-full text-xs border border-slate-200 rounded-lg p-2 h-14 focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              onClick={() => setActivePopover(null)}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="text-[11px] font-semibold bg-[#2ba0af] hover:bg-[#208491] text-white px-4 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </div>
      )}

      {/* Floating Holiday Popover Editor */}
      {activeHolidayPopover && (
        <div
          ref={holidayPopoverRef}
          style={{
            position: 'fixed',
            left: `${activeHolidayPopover.clientX}px`,
            top: `${activeHolidayPopover.clientY}px`,
          }}
          className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 w-72 space-y-4 animate-in fade-in zoom-in duration-100 text-left"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div>
              <span className="font-bold text-gray-800 text-xs block flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-rose-500 animate-pulse" /> Atur Hari Libur
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Tanggal: {activeHolidayPopover.date.split('-').reverse().join('/')}
              </span>
            </div>
          </div>

          {/* Toggle Choice */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1.5">
              Jenis Hari Kerja
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsHolidayInput(false)}
                className={`h-9 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  !isHolidayInput
                    ? 'border-[#3bc3d1] bg-[#e0f9fa]/60 text-[#2ba0af] font-black'
                    : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                Hari Kerja
              </button>
              <button
                type="button"
                onClick={() => setIsHolidayInput(true)}
                className={`h-9 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  isHolidayInput
                    ? 'border-rose-500 bg-rose-50 text-rose-600 font-black'
                    : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                Hari Libur
              </button>
            </div>
          </div>

          {/* Name input if holiday */}
          {isHolidayInput && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-100">
              <label className="block text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1" htmlFor="popover_holiday_name">
                Nama Hari Libur
              </label>
              <input
                id="popover_holiday_name"
                type="text"
                value={holidayNameInput}
                onChange={(e) => setHolidayNameInput(e.target.value)}
                placeholder="Contoh: Tahun Baru, Libur Pilkada, dll"
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
                autoFocus
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              onClick={() => setActiveHolidayPopover(null)}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSaveHoliday}
              className="text-[11px] font-semibold bg-[#2ba0af] hover:bg-[#208491] text-white px-4 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
