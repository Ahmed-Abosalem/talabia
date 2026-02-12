import { Search } from "lucide-react";
import "./SearchBar.css";

export default function SearchBar({
  placeholder = "ابحث عن منتج...",
  value,
  onChange,
}) {
  return (
    <div className="search-wrapper">
      <Search size={18} />
      <input
        type="search"
        className="search-input"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        autoComplete="off"
        inputMode="search"
      />
    </div>
  );
}
