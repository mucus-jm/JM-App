import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { SheetsConfig, Employee, AttendanceRecord, HolidayRecord } from '../types';

interface SheetsSyncPanelProps {
  config: SheetsConfig;
  onUpdateConfig: (config: Partial<SheetsConfig>) => void;
  employees: Employee[];
  dates: string[];
  attendance: AttendanceRecord[];
  holidays: HolidayRecord[];
  periodName: string;
}

export default function SheetsSyncPanel({
  config,
  onUpdateConfig,
  employees,
  dates,
  attendance,
  holidays,
  periodName,
}: SheetsSyncPanelProps) {
  const [webUrl, setWebUrl] = useState(config.webAppUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const googleAppsScriptCode = `/**
 * Google Apps Script untuk Sinkronisasi Real-time Absensi Karyawan
 * Tempelkan kode ini di Extensions -> Apps Script pada Google Sheets Anda.
 */

function doGet(e) {
  return HtmlService.createHtmlOutput(
    "<div style='font-family:sans-serif;padding:20px;text-align:center;'>" +
    "<h3>Aplikasi Absensi Karyawan Sync Service</h3>" +
    "<p style='color:#555;'>Sinkronisasi Google Sheet Anda dengan webapp absensi aktif!</p>" +
    "</div>"
  );
}

function doPost(e) {
  var response = { success: false, message: "" };
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var operation = payload.operation;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    if (operation === "ping") {
      response.success = true;
      response.message = "Berhasil terhubung dengan Spreadsheet: '" + ss.getName() + "'";
      return ContentService.createTextOutput(JSON.stringify(response))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (operation === "sync") {
      var employees = payload.employees;
      var dates = payload.dates;
      var attendanceList = payload.attendance;
      var holidaysMap = payload.holidaysMap || {};
      var periodName = payload.periodName || "Periode Absensi";
      
      sheet.clear();
      
      // Judul Periode di baris ke-1
      var titleCell = sheet.getRange(1, 1);
      titleCell.setValue("Periode: " + periodName);
      titleCell.setFontWeight("bold");
      titleCell.setFontSize(12);
      
      // Header Table di baris ke-2
      var headers = ["ID", "Nama Karyawan", "M", "D", "TM", "I", "S", "C"];
      for (var i = 0; i < dates.length; i++) {
        // Format date string for the header
        var dateParts = dates[i].split("-");
        var formattedDate = dates[i];
        if (dateParts.length === 3) {
          var months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
          var mIdx = parseInt(dateParts[1], 10) - 1;
          formattedDate = dateParts[2] + "-" + months[mIdx];
        }
        headers.push(formattedDate);
      }
      
      var headerRange = sheet.getRange(2, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#3bc3d1"); // Sky Blue / Teal
      headerRange.setFontColor("#ffffff");
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      sheet.setRowHeight(2, 28);
      
      // Write data rows starting at Row 3
      for (var r = 0; r < employees.length; r++) {
        var emp = employees[r];
        var rowNum = 3 + r;
        
        sheet.getRange(rowNum, 1).setValue(emp.id);
        sheet.getRange(rowNum, 2).setValue(emp.name);
        
        // Buat rumus Excel untuk menghitung otomatis total
        var startColLetter = getColumnLetter(9); // Kolom I
        var endColLetter = getColumnLetter(8 + dates.length);
        
        // M (Masuk), D, TM, I, S, C
        sheet.getRange(rowNum, 3).setFormula("=COUNTIF(" + startColLetter + rowNum + ":" + endColLetter + rowNum + ', "M")');
        sheet.getRange(rowNum, 4).setFormula("=COUNTIF(" + startColLetter + rowNum + ":" + endColLetter + rowNum + ', "D")');
        sheet.getRange(rowNum, 5).setFormula("=COUNTIF(" + startColLetter + rowNum + ":" + endColLetter + rowNum + ', "TM")');
        sheet.getRange(rowNum, 6).setFormula("=COUNTIF(" + startColLetter + rowNum + ":" + endColLetter + rowNum + ', "I")');
        sheet.getRange(rowNum, 7).setFormula("=COUNTIF(" + startColLetter + rowNum + ":" + endColLetter + rowNum + ', "S")');
        sheet.getRange(rowNum, 8).setFormula("=COUNTIF(" + startColLetter + rowNum + ":" + endColLetter + rowNum + ', "C")');
        
        // Isi status absensi per tanggal
        for (var d = 0; d < dates.length; d++) {
          var date = dates[d];
          var colNum = 9 + d;
          var cell = sheet.getRange(rowNum, colNum);
          
          // Cari record status
          var recordStatus = "";
          var recordNotes = "";
          for (var k = 0; k < attendanceList.length; k++) {
            if (attendanceList[k].employeeId === emp.id && attendanceList[k].date === date) {
              recordStatus = attendanceList[k].status;
              recordNotes = attendanceList[k].notes || "";
              break;
            }
          }
          
          cell.setValue(recordStatus);
          cell.setHorizontalAlignment("center");
          
          if (recordNotes) {
            cell.setComment(recordNotes);
          }
          
          // Pewarnaan custom
          if (holidaysMap[date] === true) {
            cell.setBackground("#ececec"); // Abu-abu untuk libur
          } else if (recordStatus === "NA") {
            cell.setBackground("#111111"); // Hitam solid untuk non-aktif
            cell.setFontColor("#111111");
          } else if (recordStatus === "M") {
            cell.setFontColor("#008000");
          } else if (recordStatus === "TM") {
            cell.setBackground("#ffcccc"); // Merah tipis untuk alpa
            cell.setFontColor("#cc0000");
          }
        }
      }
      
      // Auto resizing column width
      sheet.autoResizeColumns(1, headers.length);
      
      response.success = true;
      response.message = "Berhasil sinkronisasi " + employees.length + " karyawan & " + dates.length + " hari.";
    }
  } catch (err) {
    response.success = false;
    response.message = "Error: " + err.toString();
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
                       .setMimeType(ContentService.MimeType.JSON);
}

function getColumnLetter(col) {
  var temp, letter = "";
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleConnectAndSync = async () => {
    if (!webUrl) {
      setTestResult({ success: false, message: 'Harap masukkan URL Aplikasi Web terlebih dahulu.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // 1. First test ping
      const pingResponse = await fetch(webUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain', // standard fetch for bypass CORS preflight in Apps Script
        },
        body: JSON.stringify({ operation: 'ping' }),
      });

      const pingData = await pingResponse.json();

      if (pingData.success) {
        // 2. Perform sync automatically
        const holidaysMap: Record<string, boolean> = {};
        holidays.forEach(h => {
          if (h.isHoliday) holidaysMap[h.date] = true;
        });

        const syncResponse = await fetch(webUrl, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({
            operation: 'sync',
            employees,
            dates,
            attendance,
            holidaysMap,
            periodName,
          }),
        });

        const syncData = await syncResponse.json();

        if (syncData.success) {
          setTestResult({
            success: true,
            message: `Koneksi Berhasil! ${syncData.message}`,
          });
          onUpdateConfig({
            webAppUrl: webUrl,
            isConnected: true,
            lastSyncedAt: new Date().toLocaleString('id-ID'),
          });
        } else {
          setTestResult({
            success: false,
            message: `Koneksi terjalin, namun gagal sinkronisasi: ${syncData.message}`,
          });
        }
      } else {
        setTestResult({
          success: false,
          message: `Gagal terhubung: ${pingData.message || 'Respons tidak valid dari Apps Script.'}`,
        });
      }
    } catch (err: any) {
      console.error('Apps Script Sync Error:', err);
      // Fallback message with troubleshooting help
      setTestResult({
        success: false,
        message: 'Koneksi gagal. Pastikan Deploy Apps Script Anda di-set ke "Who has access: Anyone" dan web app URL sudah benar. Google Apps Script mungkin membutuhkan waktu beberapa detik saat deploy pertama.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div id="sheets_sync_panel" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#3bc3d1] to-[#30a9b6] px-6 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Integrasi Google Sheets</h3>
            <p className="text-xs text-white/85">Gunakan Google Sheets Anda sebagai database real-time utama</p>
          </div>
        </div>
        <div className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.isConnected ? 'bg-emerald-500/25 border border-emerald-400 text-white' : 'bg-amber-500/25 border border-amber-400 text-amber-100'}`}>
          {config.isConnected ? '● Terhubung & Sinkron' : '○ Offline / Belum Terhubung'}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h4 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#3bc3d1]" />
            Langkah 1: Setup Google Spreadsheet Baru
          </h4>
          <ol className="list-decimal pl-5 text-xs text-gray-600 space-y-2">
            <li>Buka <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-[#3bc3d1] hover:underline inline-flex items-center gap-0.5 font-medium">Google Spreadsheet Baru <ExternalLink className="w-3 h-3" /></a></li>
            <li>Di spreadsheet Anda, klik tab menu <strong>Extensions (Ekstensi)</strong> &gt; <strong>Apps Script</strong>.</li>
            <li>Hapus seluruh kode default yang ada di dalam editor script.</li>
          </ol>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-sm text-gray-800">Langkah 2: Salin & Tempel Kode Berikut</h4>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>
          <div className="relative rounded-lg overflow-hidden bg-gray-900 border border-gray-800 max-h-48 overflow-y-auto">
            <pre className="p-4 text-[10px] text-gray-300 font-mono leading-relaxed">
              {googleAppsScriptCode}
            </pre>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm text-gray-800 mb-2">Langkah 3: Deploy sebagai Aplikasi Web (Web App)</h4>
          <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1.5">
            <li>Klik tombol **Simpan** (ikon disket) di Google Apps Script.</li>
            <li>Klik tombol biru **Deploy** &gt; **New deployment** (Terapkan Baru).</li>
            <li>Klik ikon gerigi di sebelah kiri, pilih **Web app** (Aplikasi Web).</li>
            <li>Setel konfigurasi berikut:
              <ul className="list-none pl-3 mt-1 space-y-0.5 text-gray-500 font-medium">
                <li>• **Execute as (Jalankan sebagai):** <span className="text-gray-700">"Me" (Email Anda)</span></li>
                <li>• **Who has access (Siapa yang memiliki akses):** <span className="text-gray-700">"Anyone" (Siapa saja)</span></li>
              </ul>
            </li>
            <li>Klik **Deploy**, jika Google meminta otorisasi, berikan akses penuh (klik *Advanced* &gt; *Go to Untitled Project (unsafe)* &gt; *Allow*).</li>
            <li>Salin **Web app URL** yang diberikan (biasanya berakhiran `/exec`).</li>
          </ul>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <h4 className="font-semibold text-sm text-gray-800 mb-2">Langkah 4: Hubungkan Spreadsheet</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="web_app_url_input">
                URL Aplikasi Web Google Apps Script
              </label>
              <div className="flex gap-2">
                <input
                  id="web_app_url_input"
                  type="text"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3bc3d1]"
                />
                <button
                  onClick={handleConnectAndSync}
                  disabled={isTesting}
                  className="bg-[#3bc3d1] hover:bg-[#30a9b6] disabled:bg-gray-300 text-white text-xs px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghubungkan...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Hubungkan & Sinkron</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg flex gap-2 items-start text-xs leading-relaxed ${testResult.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                )}
                <div>{testResult.message}</div>
              </div>
            )}

            {config.isConnected && (
              <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                <span className="text-gray-500">Terakhir disinkronkan:</span>
                <span className="font-semibold text-gray-700">{config.lastSyncedAt || 'Baru Saja'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
