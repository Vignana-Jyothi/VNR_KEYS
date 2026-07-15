import { useState } from "react";
import { ChevronLeft, Filter } from "lucide-react";
import KeyCard from "./KeyCard";

const matchesSearch = (key, query) => {
  if (!query.trim()) return true;
  const term = query.toLowerCase();
  return (
    key.keyName.toLowerCase().includes(term) ||
    String(key.keyNumber).toLowerCase().includes(term) ||
    (key.location || "").toLowerCase().includes(term)
  );
};

const applyAvailabilityFilter = (keys, filter) => {
  switch (filter) {
    case "available":   return keys.filter((k) => k.status === "available");
    case "unavailable": return keys.filter((k) => k.status !== "available");
    default:            return keys;
  }
};

const DepartmentView = ({
  department,
  keys,
  searchQuery,
  onRequestKey,
  onManualAssign,
  onToggleFrequent,
  onBack,
  // Bulk selection (optional — only passed from faculty AllKeysPage)
  selectedIds   = null,   // Set<string> | null
  onToggleSelect = null,  // (keyId: string) => void | null
}) => {
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const departmentKeys   = keys.filter((k) => k.department === department);
  const filteredBySearch = departmentKeys.filter((k) => matchesSearch(k, searchQuery));
  const finalKeys        = applyAvailabilityFilter(filteredBySearch, availabilityFilter);

  const bulkEnabled = selectedIds !== null && onToggleSelect !== null;

  return (
    <div className="space-y-5 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center
            bg-gray-800 border border-gray-700 rounded-full
            transition-all duration-300 hover:bg-gray-700 hover:border-indigo-400 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-indigo-400" />
        </button>
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-white truncate">
            {department}
          </h2>
          <p className="text-gray-300 text-sm">{finalKeys.length} key{finalKeys.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {["all", "available", "unavailable"].map((f) => (
            <button
              key={f}
              onClick={() => setAvailabilityFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                transition-all duration-200 ${
                  availabilityFilter === f
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Keys list */}
      <div className="space-y-4 pb-2">
        {finalKeys.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
            <p className="text-gray-400">
              {searchQuery.trim()
                ? `No keys found matching "${searchQuery}"`
                : "No keys in this department"}
            </p>
          </div>
        ) : (
          finalKeys.map((key) => {
            const isSelected   = bulkEnabled && selectedIds.has(key.id);
            const isAvailable  = key.status === "available";
            const showCheckbox = bulkEnabled && isAvailable;

            return (
              <div key={key.id} className="relative">
                {/* Checkbox — only on available keys when bulk mode active */}
                {showCheckbox && (
                  <button
                    onClick={() => onToggleSelect(key.id)}
                    className={`absolute top-3 right-3 z-10 w-5 h-5 rounded border-2
                      flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-500 border-indigo-500"
                          : "border-gray-500 bg-gray-800/80 hover:border-indigo-400"
                      }`}
                    title={isSelected ? "Deselect" : "Select for bulk checkout"}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Highlight ring when selected */}
                <div className={`rounded-2xl transition-all duration-200 ${
                  isSelected ? "ring-2 ring-indigo-500/60" : ""
                }`}>
                  <KeyCard
                    keyData={key}
                    variant="default"
                    onRequestKey={onRequestKey}
                    onManualAssign={onManualAssign}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DepartmentView;
