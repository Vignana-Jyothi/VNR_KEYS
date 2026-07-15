import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Key, RefreshCw, RotateCcw, X } from "lucide-react";
import SearchBar from "../../../components/keys/SearchBar";
import SearchResults from "../../../components/keys/SearchResults";
import KeyCard from "../../../components/keys/KeyCard";
import BulkCheckoutModal from "../../../components/keys/BulkCheckoutModal";

const MyKeysPage = () => {
  const {
    searchQuery,
    setSearchQuery,
    takenKeys,
    keys,
    handleRequestKey,
    handleReturnKey,
    user,
    fetchTakenKeys,
    isLoadingTakenKeys,
  } = useOutletContext();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  const toggleSelect = (keyId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === takenKeys.length && takenKeys.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(takenKeys.map((k) => k.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedKeyObjects = takenKeys.filter((k) => selectedIds.has(k.id));
  const allSelected = takenKeys.length > 0 && selectedIds.size === takenKeys.length;

  const handleBulkSuccess = async () => {
    clearSelection();
    if (user?.id) await fetchTakenKeys?.(user.id);
  };

  return (
    <div className="flex-1 p-4 pb-28">
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {searchQuery.trim() && (
        <SearchResults
          searchQuery={searchQuery}
          keys={takenKeys}
          onRequestKey={handleRequestKey}
          onReturnKey={handleReturnKey}
          userRole="faculty"
          variant="taken"
        />
      )}

      {!searchQuery.trim() && (
        <>
          {/* ── Page header ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <h2 className="text-xl md:text-2xl font-bold text-white">My Keys</h2>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-400/40 text-white
                px-3 py-1 rounded-full text-sm font-medium border border-blue-600/30
                drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                {takenKeys.length} Taken
              </div>
              <button
                onClick={() => fetchTakenKeys(user?.id)}
                disabled={isLoadingTakenKeys}
                className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300
                  rounded-lg border border-blue-600/30 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh taken keys"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingTakenKeys ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {isLoadingTakenKeys ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Loading taken keys…</p>
            </div>
          ) : takenKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No keys taken</p>
              <p className="text-gray-500 text-sm mt-2">Go to Key List to request keys</p>
            </div>
          ) : (
            <>
              {/* ── Bulk-select bar ─────────────────────────────────── */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3
                bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Select-all checkbox */}
                  <button
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center
                      flex-shrink-0 transition-colors ${
                        allSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-500 hover:border-blue-400"
                      }`}
                    title={allSelected ? "Deselect all" : "Select all"}
                  >
                    {allSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className="text-sm text-gray-300">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} selected`
                      : "Select keys to return in bulk"}
                  </span>
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearSelection}
                      className="p-1 text-gray-400 hover:text-white transition-colors
                        rounded-lg hover:bg-gray-700"
                      title="Clear selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowBulkModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5
                        bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                        text-sm font-medium transition-colors min-h-[36px]"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Return {selectedIds.size} Key{selectedIds.size > 1 ? "s" : ""}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Key cards with checkboxes ────────────────────── */}
              <div className="space-y-4">
                {takenKeys.map((key) => (
                  <div key={key.id} className="relative">
                    {/* Checkbox overlay — top-left corner */}
                    <button
                      onClick={() => toggleSelect(key.id)}
                      className={`absolute top-3 right-3 z-10 w-5 h-5 rounded border-2
                        flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedIds.has(key.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-500 bg-gray-800/80 hover:border-blue-400"
                        }`}
                      title={selectedIds.has(key.id) ? "Deselect" : "Select for bulk return"}
                    >
                      {selectedIds.has(key.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* Highlight ring when selected */}
                    <div className={`rounded-2xl transition-all duration-200 ${
                      selectedIds.has(key.id) ? "ring-2 ring-blue-500/60" : ""
                    }`}>
                      <KeyCard
                        keyData={key}
                        variant="taken"
                        onReturnKey={handleReturnKey}
                        showQR={false}
                        userRole="faculty"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Bulk return modal */}
      <BulkCheckoutModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        mode="return"
        selectedKeys={selectedKeyObjects}
        onSuccess={handleBulkSuccess}
      />
    </div>
  );
};

export default MyKeysPage;
