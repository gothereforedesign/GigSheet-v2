import React, { useState } from 'react';
import { Download, Upload, Database, CheckCircle2, AlertCircle, X, Loader2, FileJson } from 'lucide-react';
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
    setExportStatus('Preparing export...');
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const blob = await exportLibraryData((msg) => setExportStatus(msg));
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `GigSheet_App_Backup_${dateStr}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg('Entire app contents downloaded successfully!');
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err.message || 'Failed to download app contents.');
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
      setSuccessMsg('App contents uploaded & restored successfully! All charts, categories, colors, and setlists are loaded.');
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Failed to upload backup file. Please ensure it is a valid GigSheet backup JSON file.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#0c4a6e] text-white rounded-lg shadow-2xs">
              <Database className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0c4a6e] dark:text-sky-300">
                App Contents & Backup
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Two Full-Width Interactive Action Containers */}
        <div className="p-5 space-y-3 overflow-y-auto">
          {successMsg && (
            <div className="p-3 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[#0c4a6e] dark:text-sky-200 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bar 1: Entire Container is the Download Button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isImporting}
            className="w-full text-left border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-all rounded-xl bg-slate-50/70 dark:bg-slate-800/50 p-4 flex items-center justify-between gap-3 shadow-2xs cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-[#0c4a6e] text-white rounded-xl shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 stroke-[2.2]" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0c4a6e] dark:text-sky-300 truncate">
                  {isExporting ? 'Exporting App Contents...' : 'Download App Contents'}
                </h3>
                {isExporting && exportStatus && (
                  <p className="text-[10px] text-sky-700 dark:text-sky-400 font-bold mt-0.5 flex items-center gap-1">
                    <span>{exportStatus}</span>
                  </p>
                )}
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-[#0c4a6e] dark:group-hover:text-sky-300 transition-colors shrink-0" />
          </button>

          {/* Bar 2: Entire Container is the Upload Label */}
          <label
            className={`w-full text-left border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all rounded-xl bg-slate-50/70 dark:bg-slate-800/50 p-4 flex items-center justify-between gap-3 shadow-2xs cursor-pointer active:scale-[0.99] group ${
              isImporting || isExporting ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-purple-900 text-white rounded-xl shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 stroke-[2.2]" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-950 dark:text-purple-300 truncate">
                  {isImporting ? 'Uploading & Restoring...' : 'Upload App Content File'}
                </h3>
                {isImporting && (
                  <p className="text-[10px] text-purple-800 dark:text-purple-400 font-bold mt-0.5 flex items-center gap-1">
                    <span>
                      {importProgress
                        ? `${importProgress.processed} / ${importProgress.total} items`
                        : 'Restoring library items...'}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <Upload className="w-4 h-4 text-slate-400 group-hover:text-purple-900 dark:group-hover:text-purple-300 transition-colors shrink-0" />
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportFileChange}
              disabled={isImporting || isExporting}
              className="hidden"
            />
          </label>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

