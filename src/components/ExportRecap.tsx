import React from 'react';
import { Download, Printer, FileSpreadsheet, Eye } from 'lucide-react';
import { Employee, AttendanceRecord, HolidayRecord } from '../types';

interface ExportRecapProps {
  employees: Employee[];
  dates: string[];
  attendance: AttendanceRecord[];
  holidays: HolidayRecord[];
  periodName: string;
}

export default function ExportRecap({
  employees,
  dates,
  attendance,
  holidays,
  periodName,
}: ExportRecapProps) {
  // Helper to obtain status count for employee
  const getStatusCount = (empId: string, status: string) => {
    return attendance.filter(
      r => r.employeeId === empId && r.status === status && !isDateHoliday(r.date)
    ).length;
  };

  const isDateHoliday = (dateStr: string) => {
    return holidays.some(h => h.date === dateStr && h.isHoliday);
  };

  const handleExportCSV = () => {
    // CSV Header row
    const headers = ['ID Karyawan', 'Nama Karyawan', 'M', 'D', 'TM', 'I', 'S', 'C'];
    dates.forEach(d => {
      // e.g. 21-Jun
      const dateParts = d.split('-');
      headers.push(dateParts[2] + '/' + dateParts[1]);
    });

    const csvRows = [headers.join(',')];

    employees.forEach(emp => {
      const row = [
        emp.id,
        `"${emp.name}"`,
        getStatusCount(emp.id, 'M'),
        getStatusCount(emp.id, 'D'),
        getStatusCount(emp.id, 'TM'),
        getStatusCount(emp.id, 'I'),
        getStatusCount(emp.id, 'S'),
        getStatusCount(emp.id, 'C'),
      ];

      dates.forEach(date => {
        const record = attendance.find(r => r.employeeId === emp.id && r.date === date);
        row.push(record ? record.status || '-' : '-');
      });

      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap_absensi_${periodName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="export_recap_panel" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">Unduh & Cetak Hasil</h3>
          <p className="text-xs text-gray-400">Ekspor rekapitulasi gajian langsung ke file lokal</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#46c2d1] hover:bg-[#3bc3d1] text-white text-xs px-4 py-2.5 rounded-lg font-medium transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV (Excel)</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs px-4 py-2.5 rounded-lg font-medium transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      <div className="bg-[#f0f9fa] border border-sky-100 rounded-lg p-3 text-xs text-sky-800 leading-relaxed">
        <strong className="block text-sky-900 mb-0.5">Analisis Ringkasan Kehadiran:</strong>
        Rumus Excel otomatis dari Google Sheets akan menghitung jumlah hari **"M" (Masuk)** dikali upah harian Anda untuk menentukan total gaji pokok pada saat cutoff. Cetak atau Ekspor file ini setiap tanggal 20 untuk diserahkan ke bagian keuangan.
      </div>
    </div>
  );
}
