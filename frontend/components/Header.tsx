"use client";

interface Props {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  showUpload?: boolean;
}

export default function Header({ onUpload, loading, showUpload = true }: Props) {
  return (
    <div className="flex justify-between items-end mb-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Collegiate Grill <span className="text-indigo-400">ERP</span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Financial & Inventory Management System
        </p>
      </div>
      {/* 파일 업로드 영역 (옵션) */}
      {showUpload !== false && (
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
            Upload CSV (Bank / Invoice / CC)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={onUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-xs file:font-bold
              file:bg-indigo-600 file:text-white
              hover:file:bg-indigo-500
              cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}