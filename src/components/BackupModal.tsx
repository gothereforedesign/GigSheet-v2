import React, { useState } from 'react';
import { Download, Upload, Database, CheckCircle2, AlertCircle, X, Loader2, Link as LinkIcon, Globe } from 'lucide-react';
import { exportLibraryData, importLibraryData } from '../lib/backup';
import { saveSongsBatch } from '../lib/db';
import { Song } from '../types';

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

  // External Google Sheets / CSV URL Sync state
  const [externalUrl, setExternalUrl] = useState('');
  const [isSyncingUrl, setIsSyncingUrl] = useState(false);

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
      setSuccessMsg('App contents uploaded & restored successfully! All charts, categories, and setlists are loaded.');
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Failed to upload backup file. Please ensure it is a valid GigSheet backup JSON file.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      e.target.value = '';
    }
  };

  const handleSyncExternalUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalUrl.trim()) return;

    setIsSyncingUrl(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const targetUrl = externalUrl.trim();
      const response = await fetch(targetUrl);
      const text = await response.text();
      let songsToImport: Song[] = [];

      if (targetUrl.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : parsed.songs || [];
        songsToImport = arr.map((item: any, idx: number) => ({
          id: item.id || `ext_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          title: item.title || 'Untitled Chart',
          artist: item.artist || '',
          genre: item.genre || 'General',
          section: item.section || 'sheet_music',
          key: item.key || 'Cmaj',
          tempo: item.tempo || 120,
          type: 'pdf',
          fileUrl: item.fileUrl || item.pdfUrl || item.url,
          dateAdded: Date.now(),
        }));
      } else {
        // CSV parsing (Google Sheets CSV export)
        const lines = text.split('\n').filter(Boolean);
        if (lines.length === 0) throw new Error('Empty CSV response from spreadsheet URL.');
        const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

        const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('name') || h.includes('song'));
        const artistIdx = headers.findIndex((h) => h.includes('artist') || h.includes('composer'));
        const genreIdx = headers.findIndex((h) => h.includes('genre') || h.includes('category') || h.includes('cat'));
        const urlIdx = headers.findIndex((h) => h.includes('url') || h.includes('pdf') || h.includes('link') || h.includes('drive'));
        const keyIdx = headers.findIndex((h) => h.includes('key'));
        const tempoIdx = headers.findIndex((h) => h.includes('tempo') || h.includes('bpm'));
        const sectionIdx = headers.findIndex((h) => h.includes('section'));

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
          const title = titleIdx !== -1 ? row[titleIdx] : row[0];
          const fileUrl = urlIdx !== -1 ? row[urlIdx] : row[3] || row[1];
          if (!title || !fileUrl) continue;

          songsToImport.push({
            id: `ext_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
            title,
            artist: artistIdx !== -1 ? row[artistIdx] : '',
            genre: genreIdx !== -1 ? row[genreIdx] : 'General',
            section: sectionIdx !== -1 && row[sectionIdx]?.toLowerCase().includes('tech') ? 'technique' : 'sheet_music',
            key: keyIdx !== -1 ? row[keyIdx] : 'Cmaj',
            tempo: tempoIdx !== -1 ? parseInt(row[tempoIdx], 10) || 120 : 120,
            type: 'pdf',
            fileUrl,
            dateAdded: Date.now(),
          });
        }
      }

      if (songsToImport.length === 0) {
        throw new Error('No valid songs found in the external spreadsheet or CSV.');
      }

      await saveSongsBatch(songsToImport, (processed, total) => {
        setImportProgress({ processed, total });
      });
      await onLibraryReload();
      setSuccessMsg(`Successfully synced ${songsToImport.length} charts from Google Sheets / External URL!`);
      setExternalUrl('');
    } catch (err: any) {
      console.error('External sync error:', err);
      setErrorMsg(err.message || 'Failed to fetch or parse external spreadsheet URL.');
    } finally {
      setIsSyncingUrl(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-8 md:pt-12">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-zinc-900 dark:bg-zinc-800 text-white rounded-lg shadow-2xs border border-zinc-700">
              <Database className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                App Contents & Google Sheets / Drive Sync
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

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sheets / External Spreadsheet URL Sync Box */}
          <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/30 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-sky-950 dark:text-sky-200">
                Sync from Google Sheets / External URL
              </h3>
            </div>
            <p className="text-[11px] text-sky-900/80 dark:text-sky-300 leading-relaxed">
              Paste a public Google Sheets CSV export URL or JSON manifest URL. PDFs can be stored in Google Drive or external web storage and streamed directly without filling browser memory.
            </p>
            <form onSubmit={handleSyncExternalUrl} className="flex gap-2">
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-sky-300 dark:border-sky-800 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-sky-500"
                required
              />
              <button
                type="submit"
                disabled={isSyncingUrl || isExporting || isImporting}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {isSyncingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                <span>Sync</span>
              </button>
            </form>
          </div>

          {/* Neutral Charcoal Container: Download App Contents */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isImporting || isSyncingUrl}
            className="w-full text-left border border-zinc-800 dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500 hover:bg-zinc-950 dark:hover:bg-zinc-850 transition-all rounded-xl bg-zinc-900 dark:bg-zinc-800 p-4 flex items-center justify-between gap-3 shadow-md cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none group text-white"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-black dark:bg-zinc-900 text-white rounded-xl shadow-2xs shrink-0 group-hover:scale-105 transition-transform border border-zinc-700">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
                ) : (
                  <Download className="w-4 h-4 stroke-[2.2] text-zinc-100" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100 truncate">
                  {isExporting ? 'Exporting App Contents...' : 'Download App Backup JSON'}
                </h3>
                {isExporting && exportStatus && (
                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5 flex items-center gap-1">
                    <span>{exportStatus}</span>
                  </p>
                )}
              </div>
            </div>
            <Download className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Neutral Slate Container: Upload App Content File */}
          <label
            className={`w-full text-left border border-slate-700 dark:border-slate-600 hover:border-slate-500 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all rounded-xl bg-slate-800/90 dark:bg-slate-800 p-4 flex items-center justify-between gap-3 shadow-md cursor-pointer active:scale-[0.99] group text-white ${
              isImporting || isExporting || isSyncingUrl ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-slate-900 dark:bg-slate-900 text-white rounded-xl shadow-2xs shrink-0 group-hover:scale-105 transition-transform border border-slate-700">
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                ) : (
                  <Upload className="w-4 h-4 stroke-[2.2] text-slate-100" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 truncate">
                  {isImporting ? 'Uploading & Restoring...' : 'Upload App Backup JSON'}
                </h3>
                {isImporting && (
                  <p className="text-[10px] text-slate-300 font-bold mt-0.5 flex items-center gap-1">
                    <span>
                      {importProgress
                        ? `${importProgress.processed} / ${importProgress.total} items`
                        : 'Restoring library items...'}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <Upload className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0" />
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportFileChange}
              disabled={isImporting || isExporting || isSyncingUrl}
              className="hidden"
            />
          </label>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-zinc-900/90 border-t border-slate-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-zinc-700 shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
