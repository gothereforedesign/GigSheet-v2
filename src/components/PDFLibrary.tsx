import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, PDFDocument } from '../db/database';
import { Search, FileText, Trash2, Eye, Music, Loader2 } from 'lucide-react';
import { PDFViewer } from './PDFViewer';

export const PDFLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewingDoc, setViewingDoc] = useState<PDFDocument | null>(null);

  const categories = ['All', 'Sheet Music', 'Technique', 'Scales', 'Exercises', 'Unassigned'];

  // Reactive IndexedDB query with Dexie useLiveQuery (defaults to undefined while loading)
  const pdfList = useLiveQuery(
    async () => {
      let query = db.pdfs.orderBy('createdAt').reverse();

      let results = await query.toArray();

      // Category Filter
      if (selectedCategory !== 'All') {
        results = results.filter((doc) => doc.category === selectedCategory);
      }

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        results = results.filter(
          (doc) =>
            doc.title.toLowerCase().includes(q) ||
            doc.fileName.toLowerCase().includes(q) ||
            doc.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      return results;
    },
    [selectedCategory, searchQuery]
  );

  // Safe fallback array while useLiveQuery resolves
  const documents = pdfList || [];
  const isLoading = pdfList === undefined;

  const handleDelete = async (e: React.MouseEvent, id?: number) => {
    e.stopPropagation();
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this PDF chart?')) {
      await db.pdfs.delete(id);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Delete ALL PDF documents from Dexie IndexedDB? This action cannot be undone.')) {
      await db.pdfs.clear();
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
            <Music className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Music PDF Library</h2>
            <p className="text-xs text-slate-400">
              {isLoading ? (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Querying Dexie IndexedDB...
                </span>
              ) : (
                `${documents.length} chart(s) indexed in Dexie IndexedDB`
              )}
            </p>
          </div>
        </div>

        {documents.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer self-start sm:self-auto"
          >
            Clear Database
          </button>
        )}
      </div>

      {/* Search Bar & Category Pills */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search charts by title, filename, or keywords..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <Loader2 className="w-6 h-6 text-sky-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading IndexedDB records...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">No PDF charts found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {searchQuery || selectedCategory !== 'All'
              ? 'Try adjusting your search or category filter.'
              : 'Upload PDF files using the batch uploader above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => {
            const sizeMB = (doc.fileSize / (1024 * 1024)).toFixed(2);
            return (
              <div
                key={doc.id}
                onClick={() => setViewingDoc(doc)}
                className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3 relative"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-600 flex items-center justify-center shrink-0 transition-colors">
                    <FileText className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-700 truncate leading-snug">
                      {doc.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{doc.fileName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {doc.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{sizeMB} MB</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-sky-600 font-bold group-hover:underline">
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Chart</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, doc.id)}
                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                    title="Delete PDF"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewingDoc && (
        <PDFViewer
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onDelete={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
};
