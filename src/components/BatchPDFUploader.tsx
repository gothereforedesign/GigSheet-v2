import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import { db, PDFCategory, PDFDocument } from '../db/database';
import { requestPersistentStorage } from '../utils/storage';

interface BatchPDFUploaderProps {
  onUploadComplete?: (count: number) => void;
  defaultCategory?: PDFCategory;
}

export const BatchPDFUploader: React.FC<BatchPDFUploaderProps> = ({
  onUploadComplete,
  defaultCategory = 'Sheet Music',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PDFCategory>(defaultCategory);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: PDFCategory[] = ['Sheet Music', 'Technique', 'Scales', 'Exercises', 'Unassigned'];

  // Helper to infer title and category from filename
  const parseFileName = (fileName: string): { title: string; category: PDFCategory } => {
    const nameWithoutExt = fileName.replace(/\.pdf$/i, '').trim();
    const cleanTitle = nameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const lower = nameWithoutExt.toLowerCase();
    let category: PDFCategory = selectedCategory;

    if (lower.includes('scale') || lower.includes('arpeggio')) {
      category = 'Scales';
    } else if (lower.includes('exercise') || lower.includes('etude') || lower.includes('hanon') || lower.includes('czerny')) {
      category = 'Exercises';
    } else if (lower.includes('technique') || lower.includes('warmup') || lower.includes('drill')) {
      category = 'Technique';
    } else if (lower.includes('sheet') || lower.includes('song') || lower.includes('score') || lower.includes('chart')) {
      category = 'Sheet Music';
    }

    return { title: cleanTitle, category };
  };

  const processFiles = async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select valid PDF files.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: 'info', text: `Preparing to store ${pdfFiles.length} PDF(s)...` });

    try {
      // Ensure persistent storage is requested
      await requestPersistentStorage();

      const newDocs: PDFDocument[] = pdfFiles.map((file) => {
        const { title, category } = parseFileName(file.name);
        // Extract tags from words in title
        const words = title
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2);
        const tags = Array.from(new Set(words));

        return {
          title,
          category,
          tags,
          fileName: file.name,
          fileSize: file.size,
          blob: file,
          createdAt: Date.now(),
        };
      });

      // Bulk Add to Dexie IndexedDB
      await db.pdfs.bulkAdd(newDocs);

      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${pdfFiles.length} PDF chart(s) into IndexedDB!`,
      });

      if (onUploadComplete) {
        onUploadComplete(pdfFiles.length);
      }
    } catch (error: any) {
      console.error('[BatchPDFUploader] Bulk add error:', error);
      setStatusMessage({
        type: 'error',
        text: `Batch upload failed: ${error?.message || 'IndexedDB error'}`,
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [selectedCategory]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-sky-600" />
            Batch PDF Uploader
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Drop multiple PDF music files to store directly in Dexie IndexedDB.
          </p>
        </div>

        {/* Category selector for incoming batch */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <span className="text-[11px] font-bold text-slate-500 px-2 uppercase tracking-wider">Default Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as PDFCategory)}
            className="text-xs font-bold bg-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-sky-500 bg-sky-50/80 scale-[0.99]'
            : 'border-slate-300 hover:border-sky-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
            <p className="text-xs font-bold text-slate-700">Writing binary PDF streams into IndexedDB...</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-sky-100/80 text-sky-600 flex items-center justify-center">
              <FileText className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Click or drag & drop PDF files here
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports bulk import for sheet music, technique, scales & exercises
              </p>
            </div>
            <div className="mt-1 inline-flex items-center gap-1 px-3 py-1 bg-slate-200/70 text-slate-700 text-[11px] font-bold rounded-full">
              <Sparkles className="w-3 h-3 text-sky-600" />
              <span>Auto-detects category & title keywords</span>
            </div>
          </>
        )}
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-sky-50 text-sky-800 border border-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {statusMessage.type === 'info' && <Loader2 className="w-4 h-4 text-sky-600 animate-spin shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-black/5 rounded-md cursor-pointer text-slate-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
