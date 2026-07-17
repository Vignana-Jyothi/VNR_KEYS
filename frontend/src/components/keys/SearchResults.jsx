import { Search } from "lucide-react";
import KeyCard from "./KeyCard";

const SearchResults = ({ 
  searchQuery, 
  keys, 
  onRequestKey, 
  onCollectKey, 
  onToggleFavorite,
  favoriteKeys = [],
  onReturnKey,
  onManualAssign,
  selectedIds = null,
  onToggleSelect = null,
  userRole = "faculty", // "faculty" or "security"
  variant = "all" // "all" or "taken"
}) => {
  // Filter keys based on search query
  const filteredKeys = keys.filter(key =>
    searchQuery === "" ||
    key.keyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.keyNumber?.toString().includes(searchQuery) ||
    key.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.block?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bulkEnabled = selectedIds !== null && onToggleSelect !== null;

  // Don't render if no search query
  if (!searchQuery.trim()) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-green-400 flex-shrink-0" />
          <h3 className="text-base md:text-lg font-semibold text-white">
            Search Results
          </h3>
          <span className="bg-green-600/20 text-green-300 px-2 py-0.5 rounded-full text-xs font-medium border border-green-600/30">
            {filteredKeys.length} result{filteredKeys.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="text-xs md:text-sm text-gray-400 truncate max-w-[140px]">
          "{searchQuery}"
        </div>
      </div>

      {filteredKeys.length === 0 ? (
        <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400 text-lg mb-1">No keys found</p>
          <p className="text-gray-500 text-sm">Try adjusting your search terms</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredKeys.map((key) => {
            // Compute KeyCard variant per key so buttons render correctly
            let keyVariant = variant; // use explicit variant if provided

            if (variant === "all") {
              // determine sensible default variants compatible with KeyCard
              if (userRole === "security") {
                // security expects 'default' for available keys to show Assign button
                keyVariant = key.status === "available" ? "default" : "unavailable";
              } else {
                // faculty/admin: show 'taken' variant for unavailable keys so return QR shows
                keyVariant = key.status === "unavailable" ? "taken" : "default";
              }
            }

            const isSelected = bulkEnabled && selectedIds.has(key.id);
            const isAvailable = key.status === "available";
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
                    key={key.id}
                    keyData={key}
                    variant={keyVariant}
                    onRequestKey={onRequestKey}
                    onCollectKey={onCollectKey}
                    onToggleFavorite={onToggleFavorite}
                    isFavorite={favoriteKeys.some(fk => fk.id === key.id)}
                    isSelected={isSelected}
                    onReturnKey={onReturnKey}
                    onManualAssign={onManualAssign}
                    userRole={userRole}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
