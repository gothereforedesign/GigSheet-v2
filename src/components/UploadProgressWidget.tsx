import React from 'react';
import { UploadQueueItem } from '../hooks/usePDFUploadQueue';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  HardDrive,
} from 'lucide-react';

interface UploadProgressWidgetProps {
  items: UploadQueueItem[];
  isOpen: boolean;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  quotaError?: string | null;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onClearCompleted: () => void;
  onDismiss: () => void;
}

export const UploadProgressWidget: React.FC<UploadProgressWidgetProps> = ({
  items,
  isOpen,
  isMinimized,
  setIsMinimized,
  quotaError,
  onCancel,
  onRetry,
  onClearCompleted,
  onDismiss,
}) => {
  if (!isOpen || (items.length === 0 && !quotaError)) return null;

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const activeCount = items.filter(
    (i) => i.status === 'queued' || i.status === 'processing' || i.status === 'saving'
  ).length;

  const totalCount = items.length;
  const allFinished = activeCount === 0;

  let headerText = '';
  if (quotaError) {
    headerText = 'Storage Quota Warning';
  } else if (activeCount > 0) {
    headerText = `Uploading ${activeCount} of ${totalCount} items...`;
  } else if (errorCount > 0) {
    headerText = `${completedCount} uploaded, ${errorCount} failed`;
  } else {
    headerText = `All ${completedCount} charts uploaded!`;
  }

  return (
    <div className="fixed bottom-[68px] right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] max-w-sm sm:w-96 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
      {/* Header Bar */}
      <div className={`px-4 py-3 text-white flex items-center justify-between ${quotaError ? 'bg-rose-900' : 'bg-slate-900 dark:bg-slate-800'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {quotaError ? (
            <HardDrive className="w-4 h-4 text-rose-300 shrink-0" />
          ) : activeCount > 0 ? (
            <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
          ) : errorCount > 0 ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-black truncate tracking-wide">{headerText}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-black/20 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 hover:bg-black/20 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quota Error Banner */}
      {quotaError && !isMinimized && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-100 dark:border-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Upload Halting</p>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">{quotaError}</p>
          </div>
        </div>
      )}

      {/* Scrollable Item List */}
      {!isMinimized && items.length > 0 && (
        <div className="flex flex-col max-h-72 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span>Batch Upload Queue</span>
            {allFinished && (
              <button
                type="button"
                onClick={onClearCompleted}
                className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Finished</span>
              </button>
            )}
          </div>

          <div className="overflow-y-auto p-3 space-y-2">
            {items.map((item) => {
              const sizeMB = (item.size / (1024 * 1024)).toFixed(1);
              const isCompleted = item.status === 'completed';
              const isError = item.status === 'error';
              const isActive =
                item.status === 'processing' || item.status === 'saving' || item.status === 'queued';

              return (
                <div
                  key={item.id}
                  className="p-2.5 bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 rounded-md space-y-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                        {sizeMB} MB • {item.category}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isCompleted && (
                        <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      )}
                      {isError && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-xs">
                            Error
                          </span>
                          <button
                            type="button"
                            onClick={() => onRetry(item.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Retry"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {isActive && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-black bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-xs animate-pulse">
                            {item.status === 'saving' ? 'Saving...' : 'Queue'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onCancel(item.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xs text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isError
                          ? 'bg-rose-500'
                          : 'bg-sky-600'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
