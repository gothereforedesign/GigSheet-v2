import React, { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Download, FileText, Trash2, Tag } from 'lucide-react';
import { PDFDocument, db } from '../db/database';

interface PDFViewerProps {
  doc: PDFDocument | null;
  onClose: () => void;
  onDelete?: (id: number) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ doc, onClose, onDelete }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!doc || !doc.blob) {
      setObjectUrl(null);
      return;
    }

    // Create temporary object URL for instant rendering
    const url = URL.createObjectURL(doc.blob);
    setObjectUrl(url);

    // CRITICAL: Memory cleanup on unmount or when doc changes
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [doc]);

  if (!doc) return null;

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = doc.fileName || `${doc.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDelete = async () => {
    if (doc.id && window.confirm(`Delete "${doc.title}" from Dexie database?`)) {
      await db.pdfs.delete(doc.id);
      if (onDelete) onDelete(doc.id);
      onClose();
    }
  };

  const formattedSize = (doc.fileSize / (1024 * 1024)).toFixed(2);

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 transition-all duration-200 animate-in fade-in`}
    >
      <div
        className={`bg-slate-900 border border-slate-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[90vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate leading-snug">{doc.title}</h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="bg-sky-900/60 text-sky-300 font-semibold px-2 py-0.5 rounded-md">
                  {doc.category}
                </span>
                <span>• {formattedSize} MB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {doc.id && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 hover:bg-rose-900/50 rounded-lg text-rose-400 hover:text-rose-200 cursor-pointer transition-colors"
                title="Delete PDF"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-colors ml-1"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF Canvas / iframe Viewer */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
          {objectUrl ? (
            <iframe
              src={objectUrl}
              title={doc.title}
              className="w-full h-full border-none"
            />
          ) : (
            <div className="text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span>Generating PDF Stream...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
