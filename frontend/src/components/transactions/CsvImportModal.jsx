import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import { spendsenseApi } from '../../services/api';

export default function CsvImportModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Simple CSV parser
  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must contain a header row and at least one data row.');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic comma split with quote handling
      const currentline = lines[i].split(',').map(val => val.trim().replace(/^["']|["']$/g, ''));
      if (currentline.length >= 2) {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = currentline[index] || '';
        });
        rows.push(obj);
      }
    }
    return rows;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file');
      return;
    }

    setError('');
    setFile(selectedFile);
    setResultSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        const parsed = parseCsvText(content);
        setRawRows(parsed);
        setPreviewRows(parsed.slice(0, 5));
      } catch (err) {
        setError(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const downloadSampleCsv = () => {
    const sampleContent = `Date,Amount,Description,Merchant,Category
2026-03-24,450.00,Zomato Biryani Order,Zomato,Food & Dining
2026-03-23,1250.00,Blinkit Instant Groceries,Blinkit,Groceries
2026-03-22,320.00,Uber Ride to College,Uber,Transport
2026-03-21,2499.00,Amazon Wireless Earbuds,Amazon,Shopping
2026-03-20,1450.00,Electricity Board Bill,MSEB,Bills & Utilities
2026-03-19,499.00,Netflix Monthly Subscription,Netflix,Entertainment
2026-03-18,650.00,Apollo Pharmacy Prescription,Apollo,Healthcare
2026-03-17,1200.00,Textbooks for Semester,Bookstore,Education
2026-03-16,3800.00,IRCTC Train Ticket to Pune,IRCTC,Travel`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spendsense_sample_transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!rawRows.length) return;
    setLoading(true);
    setError('');

    try {
      const res = await spendsenseApi.importCsv(rawRows);
      if (res.success && res.data) {
        setResultSummary(res.data);
        onImportComplete && onImportComplete();
      } else {
        setError(res.error?.message || 'Failed to import transactions');
      }
    } catch (err) {
      setError('An error occurred during CSV import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-card rounded-2xl p-6 border border-slate-700/80 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Import Transaction CSV</h3>
              <p className="text-xs text-slate-400">Batch ingest bank or expense statements</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success summary */}
        {resultSummary ? (
          <div className="mt-6 text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold font-display text-white">CSV Import Completed!</h4>
            <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">Successfully Imported</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{resultSummary.importedCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">Rejected / Skipped</span>
                <p className="text-2xl font-bold text-rose-400 mt-1">{resultSummary.rejectedCount}</p>
              </div>
            </div>

            {resultSummary.rejectedRows?.length > 0 && (
              <div className="text-left max-h-32 overflow-y-auto p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                <p className="font-semibold text-rose-400 mb-1">Rejection Details:</p>
                {resultSummary.rejectedRows.map((r, i) => (
                  <p key={i}>Row {r.row}: {r.reason}</p>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all"
            >
              Done & View Transactions
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {file ? file.name : 'Click to upload or drag & drop CSV file'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Standard format: Date, Amount, Description, Merchant, Category
              </p>
            </div>

            {/* Template Download Link */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Need a sample CSV to test?</span>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="flex items-center gap-1.5 text-brand-400 hover:text-brand-300 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            {/* Preview Table */}
            {previewRows.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-400" />
                  <span>Preview (First {previewRows.length} of {rawRows.length} rows)</span>
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 max-h-48 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/80 text-slate-300 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-400">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="px-3 py-1.5 whitespace-nowrap">{row.Date || row.date}</td>
                          <td className="px-3 py-1.5 font-medium text-slate-200">₹{row.Amount || row.amount}</td>
                          <td className="px-3 py-1.5 truncate max-w-[200px]">{row.Description || row.description}</td>
                          <td className="px-3 py-1.5 text-brand-300">{row.Category || row.category || 'Auto-ML'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!file || loading}
                onClick={handleImport}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Importing Rows...' : (
                  <>
                    <span>Import {rawRows.length} Transactions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
