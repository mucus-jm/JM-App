import React, { useState } from 'react';
import { UserPlus, Trash2, Edit3, Save, X, Calendar } from 'lucide-react';
import { Employee } from '../types';

interface EmployeeManagementProps {
  employees: Employee[];
  onAddEmployee: (name: string, joinDate?: string) => void;
  onUpdateEmployee: (updated: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export default function EmployeeManagement({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}: EmployeeManagementProps) {
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeJoinDate, setNewEmployeeJoinDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingJoinDate, setEditingJoinDate] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    onAddEmployee(newEmployeeName.trim(), newEmployeeJoinDate || undefined);
    setNewEmployeeName('');
    setNewEmployeeJoinDate('');
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditingName(emp.name);
    setEditingJoinDate(emp.joinDate || '');
  };

  const handleSaveEdit = () => {
    if (!editingName.trim() || !editingId) return;
    onUpdateEmployee({
      id: editingId,
      name: editingName.trim(),
      joinDate: editingJoinDate || undefined,
      isActive: true,
    });
    setEditingId(null);
  };

  const handleDelete = (emp: Employee) => {
    const isConfirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus '${emp.name}' dari database absensi? Seluruh rekaman kehadiran karyawan ini akan terhapus!`
    );
    if (isConfirmed) {
      onDeleteEmployee(emp.id);
    }
  };

  return (
    <div id="employee_management_panel" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
          <UserPlus className="w-4 h-4 text-[#3bc3d1]" />
          Daftar & Manajemen Karyawan
        </h3>
        <p className="text-xs text-gray-400">Tambah baru, edit nama, atau atur tanggal masuk kerja karyawan</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Add Form */}
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="emp_name_input">
                Nama Karyawan Baru
              </label>
              <input
                id="emp_name_input"
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="emp_join_date_input">
                Tanggal Mulai Kerja (Opsional)
              </label>
              <input
                id="emp_join_date_input"
                type="date"
                value={newEmployeeJoinDate}
                onChange={(e) => setNewEmployeeJoinDate(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-[#1e293b] hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-lg font-medium transition cursor-pointer"
          >
            + Tambah Karyawan Baru
          </button>
        </form>

        {/* Employee List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {employees.length === 0 ? (
            <p className="text-xs text-center text-gray-400 py-6">Belum ada data karyawan. Tambahkan di atas.</p>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-slate-50 transition text-xs"
              >
                {editingId === emp.id ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 mr-3">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
                    />
                    <input
                      type="date"
                      value={editingJoinDate}
                      onChange={(e) => setEditingJoinDate(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{emp.name}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-[#3bc3d1]" />
                      Mulai Kerja: {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Aktif penuh'}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {editingId === emp.id ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 px-2.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition flex items-center gap-0.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan</span>
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-gray-500 hover:text-gray-700 rounded transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(emp)}
                        className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Edit Info"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(emp)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Hapus Karyawan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
