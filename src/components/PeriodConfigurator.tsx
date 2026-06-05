import React from 'react';
import { CalendarRange, Sliders, ChevronRight } from 'lucide-react';
import { CutoffPeriod } from '../types';

interface PeriodConfiguratorProps {
  cutoff: CutoffPeriod;
  onUpdateCutoff: (newCutoff: CutoffPeriod) => void;
}

export default function PeriodConfigurator({ cutoff, onUpdateCutoff }: PeriodConfiguratorProps) {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const end = new Date(val);
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1); // standard 1 month minus 1 day

    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');

    // Auto calculate period name
    const startObj = new Date(val);
    const startDay = startObj.getDate();
    const startMonth = startObj.toLocaleString('id-ID', { month: 'short' });
    const endDay = end.getDate();
    const endMonth = end.toLocaleString('id-ID', { month: 'short' });

    onUpdateCutoff({
      startDate: val,
      endDate: `${yyyy}-${mm}-${dd}`,
      name: `${startDay} ${startMonth} - ${endDay} ${endMonth}`,
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateCutoff({
      ...cutoff,
      endDate: e.target.value,
    });
  };

  const selectPreset = (type: string) => {
    const today = new Date();
    const year = today.getFullYear();

    if (type === 'screenshot') {
      onUpdateCutoff({
        startDate: '2026-06-21',
        endDate: '2026-07-20',
        name: '21 Jun - 20 Jul',
      });
    } else if (type === 'current_month') {
      const firstDay = `${year}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDayObj = new Date(year, today.getMonth() + 1, 0);
      const lastDay = `${year}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
      const monthLabel = today.toLocaleString('id-ID', { month: 'short' });

      onUpdateCutoff({
        startDate: firstDay,
        endDate: lastDay,
        name: `1 - ${lastDayObj.getDate()} ${monthLabel}`,
      });
    } else if (type === 'next_period') {
      onUpdateCutoff({
        startDate: '2026-07-21',
        endDate: '2026-08-20',
        name: '21 Jul - 20 Ags',
      });
    }
  };

  return (
    <div id="period_configurator_panel" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
          <CalendarRange className="w-4 h-4 text-[#3bc3d1]" />
          Pengaturan Periode & Cut-off
        </h3>
        <p className="text-xs text-gray-400">Tentukan periode perhitungan gajian (Cut-off)</p>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor="start_date_input">
              Tanggal Mulai
            </label>
            <input
              id="start_date_input"
              type="date"
              value={cutoff.startDate}
              onChange={handleStartDateChange}
              className="w-full text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor="end_date_input">
              Tanggal Berakhir
            </label>
            <input
              id="end_date_input"
              type="date"
              value={cutoff.endDate}
              onChange={handleEndDateChange}
              className="w-full text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-2">
            Preset Instan
          </label>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => selectPreset('screenshot')}
              className={`text-left text-xs px-3 py-2 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                cutoff.startDate === '2026-06-21' && cutoff.endDate === '2026-07-20'
                  ? 'border-[#3bc3d1] bg-sky-50/50 text-[#3bc3d1] font-semibold'
                  : 'border-gray-100 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <span>Periode Screenshot (21 Jun - 20 Jul 2026)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => selectPreset('current_month')}
              className="text-left text-xs px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-600 transition flex items-center justify-between cursor-pointer"
            >
              <span>Bulan Berjalan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => selectPreset('next_period')}
              className={`text-left text-xs px-3 py-2 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                cutoff.startDate === '2026-07-21' ? 'border-[#3bc3d1] bg-sky-50/50 text-[#3bc3d1] font-semibold' : 'border-gray-100 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <span>Periode Beikutnya (21 Jul - 20 Ags 2026)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
