"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative ${className || "w-40"}`} ref={wrapperRef}>
      <input
        type="text"
        className="w-full bg-[#0f172a] border border-gray-600 rounded px-2 py-1.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={search}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
      />
      {isOpen && (
        <ul className="absolute z-[100] w-full bg-[#2d3748] border border-gray-500 mt-1 max-h-60 overflow-auto rounded-md shadow-2xl text-left">
          {filteredOptions.map((opt) => (
            <li
              key={opt}
              className="px-3 py-2 text-sm text-white hover:bg-indigo-600 cursor-pointer border-b border-gray-700 last:border-0"
              onClick={() => { onChange(opt); setSearch(opt); setIsOpen(false); }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}