import React, { useState } from 'react';
import { Download, Upload, Database, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { exportLibraryData, importLibraryData } from '../lib/backup';

interface BackupModalProps {
  onClose: () => void;
  onLibraryReload: () => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({ onClose, onLibraryReload }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('Starting export...');
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const blob = await exportLibraryData((msg) => setExportStatus(msg));
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `GigSheet_Library_Backup_${dateStr}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg('Library backup exported successfully!');
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err.message || 'Failed to export library backup.');
    } finally {
      setIsExporting(false);
      setExportStatus(null);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress({ processed: 0, total: 100 });
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await importLibraryData(file, (processed, total) => {
        setImportProgress({ processed, total });
      });
      await onLibraryReload();
      setSuccessMsg('Library imported successfully! All charts, PDFs, and categories have been restored.');
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Failed to import backup file. Ensure it is a valid GigSheet backup JSON file.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#0c4a6e] text-white rounded-xl shadow-2xs">
              <Database className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0c4a6e]">
                Library Sync & Backup
              </h2>
              <p className="text-[10px] text-slate-400 font-bold">
                Transfer PDFs & charts between devices or deployment domains
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Export Section */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0c4a6e] flex items-center gap-1.5">
                <Download className="w-4 h-4 text-sky-600" />
                <span>Export Library Backup</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Save a single backup file containing all your uploaded PDFs, categories, and setlists. Use this to transfer your library to Vercel or another device.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isImporting}
              className="w-full py-2.5 px-4 bg-[#0c4a6e] hover:bg-[#073652] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{exportStatus || 'Exporting Backup...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Backup File</span>
                </>
              )}
            </button>
          </div>

          {/* Import Section */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0c4a6e] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-purple-600" />
                <span>Import / Restore Library</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Restore a saved GigSheet backup file into this browser database.
              </p>
            </div>

            <label className={`w-full py-2.5 px-4 bg-purple-900 hover:bg-purple-950 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-2xs ${
              isImporting || isExporting ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
            }`}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {importProgress
                      ? `Restoring ${importProgress.processed} / ${importProgress.total}...`
                      : 'Importing Backup...'}
                  </span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Select Backup JSON File</span>
                </>
              )}
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportFileChange}
                disabled={isImporting || isExporting}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
