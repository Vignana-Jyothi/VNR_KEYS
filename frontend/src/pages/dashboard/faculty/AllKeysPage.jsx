import { useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { ShoppingBag, X } from "lucide-react";
import SearchBar from "../../../components/keys/SearchBar";
import SearchResults from "../../../components/keys/SearchResults";
import FavoriteKeysSection from "../../../components/keys/FavoriteKeysSection";
import DepartmentsSection from "../../../components/keys/DepartmentsSection";
import DepartmentView from "../../../components/keys/DepartmentView";
import BulkCheckoutModal from "../../../components/keys/BulkCheckoutModal";

const AllKeysPage = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedDepartment,
    keys,
    favoriteKeys,
    handleRequestKey,
    handleReturnKey,
    handleDepartmentClick,
    handleBackToDepartments,
    handleToggleFavorite,
    fetchKeys,
    fetchTakenKeys,
    fetchFavoriteKeys,
    user,
  } = useOutletContext();

  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  // All available keys across the full list
  const availableKeys = keys.filter((k) => k.status === "available");

  const toggleSelect = useCallback((keyId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(keyId) ? next.delete(keyId) : next.add(keyId);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    const inView = selectedDepartment
      ? availableKeys.filter((k) => k.department === selectedDepartment)
      : availableKeys;
    const allIn = inView.length > 0 && inView.every((k) => selectedIds.has(k.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allIn) inView.forEach((k) => next.delete(k.id));
      else       inView.forEach((k) => next.add(k.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedKeyObjects = keys.filter((k) => selectedIds.has(k.id) && k.status === "available");

  // Keys visible in the current view
  const viewKeys = selectedDepartment
    ? availableKeys.filter((k) => k.department === selectedDepartment)
    : availableKeys;
  const allInViewSelected =
    viewKeys.length > 0 && viewKeys.every((k) => selectedIds.has(k.id));

  const handleBulkSuccess = async () => {
    clearSelection();
    await fetchKeys?.();
    if (user?.id) await fetchTakenKeys?.(user.id);
  };

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-4 pb-28">
      {/* Search */}
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {!selectedDepartment && searchQuery.trim() && (
        <SearchResults
          searchQuery={searchQuery}
          keys={keys}
          onRequestKey={handleRequestKey}
          onReturnKey={handleReturnKey}
          onToggleFavorite={handleToggleFavorite}
          favoriteKeys={favoriteKeys}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          userRole="faculty"
        />
      )}

      {/* ── Bulk selection toolbar — always visible when keys exist ── */}
      {!searchQuery.trim() && availableKeys.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3
          bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5">
          {/* Select-all for current view */}
          <button
            onClick={toggleSelectAll}
            className={`flex items-center gap-2 text-sm transition-colors ${
              allInViewSelected ? "text-indigo-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              allInViewSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-500"
            }`}>
              {allInViewSelected && (
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "Select available keys"}
            </span>
          </button>

          {/* Action buttons */}
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5
                  bg-indigo-600 hover:bg-indigo-700 text-white
                  rounded-lg text-sm font-medium transition-colors min-h-[36px]"
              >
                <ShoppingBag className="w-4 h-4" />
                Take {selectedIds.size} Key{selectedIds.size > 1 ? "s" : ""}
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-500">
              {viewKeys.length} available in {selectedDepartment || "all departments"}
            </span>
          )}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      {selectedDepartment ? (
        <DepartmentView
          department={selectedDepartment}
          keys={keys}
          searchQuery={searchQuery}
          onRequestKey={handleRequestKey}
          onToggleFavorite={handleToggleFavorite}
          favoriteKeys={favoriteKeys}
          onBack={handleBackToDepartments}
          // Bulk selection props
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      ) : (
        !searchQuery.trim() && (
          <>
            <FavoriteKeysSection
              keys={favoriteKeys}
              onRequestKey={handleRequestKey}
              onToggleFavorite={handleToggleFavorite}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
            <DepartmentsSection
              keys={keys}
              onDepartmentClick={handleDepartmentClick}
              selectedDepartment={selectedDepartment}
            />
          </>
        )
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
