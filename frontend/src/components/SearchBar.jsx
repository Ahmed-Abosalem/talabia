import { Search, X } from "lucide-react";
import { useRef } from "react";
import "./SearchBar.css";

export default function SearchBar({
  placeholder = "ابحث عن منتج...",
  value,
  onChange,
}) {
  const inputRef = useRef(null);

  const handleClear = () => {
    onChange?.("");
    inputRef.current?.focus();
  };

  return (
    <div className="search-wrapper">
      <button
        type="button"
        className={`search-icon-toggle ${value ? "is-clear" : "is-search"}`}
        onClick={value ? handleClear : undefined}
        aria-label={value ? "مسح البحث" : "بحث"}
        tabIndex={value ? 0 : -1}
      >
        {value ? <X size={18} strokeWidth={2.5} /> : <Search size={18} />}
      </button>
      <input
        ref={inputRef}
        type="search"
        name="global_store_search"
        className="search-input"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        autoComplete="off"
        data-1p-ignore
        data-bwignore
        spellCheck="false"
      />
    </div>
  );
}
