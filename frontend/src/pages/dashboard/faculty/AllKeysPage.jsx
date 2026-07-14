import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ShoppingBag, X } from "lucide-react";
import SearchBar from "../../../components/keys/SearchBar";
import SearchResults from "../../../components/keys/SearchResults";
import FrequentlyUsedSection from "../../../components/keys/FrequentlyUsedSection";
import DepartmentsSection from "../../../components/keys/DepartmentsSection";
import DepartmentView from "../../../components/keys/DepartmentView";
import BulkCheckoutModal from "../../../components/keys/BulkCheckoutModal";

const AllKeysPage = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedDepartment,
    keys,
    frequentlyUsedKeys,
    usageCounts,
    handleRequestKey,
    handleReturnKey,
    handleDepartmentClick,
    handleBackToDepartments,
    handleToggleFrequent,
    fetchKeys,
    fetchTakenKeys,
    user,
  } = useOutletContext();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Available keys that can be bulk-selected
  const availableKeys = keys.filter((k) => k.status === "available");

  const toggleSelect = (keyId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === availableKeys.length && availableKeys.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableKeys.map((k) => k.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedKeyObjects = availableKeys.filter((k) => selectedIds.has(k.id));
  const allSelected = availableKeys.length > 0 && selectedIds.size === availableKeys.length;

  const handleBulkSuccess = async () => {
    clearSelection();
    await fetchKeys?.();
    if (user?.id) await fetchTakenKeys?.(user.id);
  };

  // ── render ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-4 pb-28">
      {/* Global Search Bar */}
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* Search results */}
      {!selectedDepartment && searchQuery.trim() && (
        <SearchResults
          searchQuery={searchQuery}
          keys={keys}
          onRequestKey={handleRequestKey}
          onReturnKey={handleReturnKey}
          userRole="faculty"
        />
      )}

      {/* Department view */}
      {selectedDepartment ? (
        <DepartmentView
          department={selectedDepartment}
          keys={keys}
          searchQuery={searchQuery}
          onRequestKey={handleRequestKey}
          onToggleFrequent={handleToggleFrequent}
          onBack={handleBackToDepartments}
        />
      ) : (
        <>
          {!searchQuery.trim() && (
            <>
              {/* ── Bulk select bar ──────────────────────────────── */}
              {availableKeys.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3
                  bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Select-all checkbox */}
                    <button
                      onClick={toggleSelectAll}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        allSelected
                          ? "bg-indigo-500 border-indigo-500"
                          : "border-gray-500 hover:border-indigo-400"
                      }`}
                      title={allSelected ? "Deselect all" : "Select all available"}
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
                        : `${availableKeys.length} available`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                      <>
                        <button
                          onClick={clearSelection}
                          className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
                          title="Clear selection"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowBulkModal(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700
                            text-white rounded-lg text-sm font-medium transition-colors min-h-[36px]"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Take {selectedIds.size} Key{selectedIds.size > 1 ? "s" : ""}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <FrequentlyUsedSection
                keys={frequentlyUsedKeys}
                availabilityFilter="all"
                onRequestKey={handleRequestKey}
                usageCounts={usageCounts}
              />

              {/* Departments section — with per-card checkboxes overlaid */}
              <DepartmentsSection
                keys={keys}
                onDepartmentClick={handleDepartmentClick}
                selectedDepartment={selectedDepartment}
              />
            </>
          )}
        </>
      )}

      {/* Bulk checkout modal */}
      <BulkCheckoutModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        mode="take"
        selectedKeys={selectedKeyObjects}
        onSuccess={handleBulkSuccess}
      />
    </div>
  );
};

export default AllKeysPage;
