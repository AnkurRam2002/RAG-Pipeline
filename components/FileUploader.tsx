"use client";

import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { UploadCloud, FileText, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function FileUploader({ userId }: { userId: string }) {
  const [status, setStatus] = useState<{ type: string; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ _id: string, chunks: number, ingestedAt: string }[]>([]);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/files?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles(data.files || []);
      }
    } catch (e) {
      console.error("Failed to fetch files", e);
    }
  }, [userId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    setIsUploading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Upload failed");
      }
      
      if (data.status === "skipped") {
        setStatus({ type: "skipped", text: "No changes detected — skipped" });
      } else if (data.status === "created") {
        setStatus({ type: "created", text: `Ingested ${data.chunks} chunks` });
      } else if (data.status === "updated") {
        setStatus({ type: "updated", text: `Re-ingested ${data.chunks} chunks (file changed)` });
      }

      fetchFiles();
    } catch (err: any) {
      console.error(err);
      setStatus({ type: "error", text: err?.message || "Upload failed" });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const StatusIcon = () => {
    if (!status) return null;
    if (status.type === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />;
    return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="glass-card p-8 flex flex-col items-center justify-center border border-[#444] hover:border-white transition-colors relative group bg-[#111]">
        <input
          type="file"
          accept=".txt,.md,.pdf"
          onChange={handleUpload}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        
        <div className="flex flex-col items-center justify-center text-center space-y-4 pointer-events-none">
          <div className="p-4 border border-[#333] group-hover:border-white transition-colors bg-[#1a1a1a]">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-widest uppercase">
              {isUploading ? "UPLOADING..." : "CLICK OR DROP FILE"}
            </p>
            <p className="text-xs text-gray-500 mt-2 font-mono uppercase tracking-wider">Supports .txt, .md, .pdf</p>
          </div>
        </div>
      </div>

      {status && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${status.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-200' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200'}`}>
          <StatusIcon />
          <span>{status.text}</span>
        </div>
      )}

      <div className="glass-card p-6 flex-1 flex flex-col overflow-hidden max-h-[400px] lg:max-h-none bg-[#111]">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-[#333] pb-3">
          <FileText className="w-4 h-4 text-white" />
          KNOWLEDGE BASE
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          {uploadedFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 mt-4 uppercase text-xs tracking-widest font-mono">
              <FileText className="w-6 h-6 mb-2 text-[#333]" />
              <p>NO DOCUMENTS FOUND</p>
            </div>
          ) : (
            uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#333] hover:border-[#666] transition-colors group animate-in fade-in slide-in-from-right-2" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex flex-col overflow-hidden mr-3">
                  <span className="font-bold text-gray-200 truncate text-xs tracking-wider uppercase" title={file._id}>
                    {file._id.replace(`${userId}_`, '')}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1 font-mono tracking-widest uppercase">{file.chunks} CHUNKS</span>
                </div>
                <button 
                  onClick={async () => {
                    const confirmed = window.confirm(`Delete ${file._id.replace(`${userId}_`, '')}?`);
                    if (!confirmed) return;
                    try {
                      const res = await fetch(`/api/files/${encodeURIComponent(file._id)}?userId=${userId}`, { method: 'DELETE' });
                      if (res.ok) fetchFiles();
                    } catch (e) { console.error("Delete failed", e); }
                  }}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-20 relative"
                  aria-label="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
