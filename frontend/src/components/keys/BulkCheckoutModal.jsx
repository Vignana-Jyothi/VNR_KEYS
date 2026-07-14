/**
 * BulkCheckoutModal
 * Handles both bulk-take and bulk-return flows:
 *  1. Shows selected keys summary
 *  2. Calls the API
 *  3. Shows progress then a detailed success / partial-failure result
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle,
  XCircle,
  Loader2,
  KeyRound,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import toast from "react-hot-toast";
import { useKeyStore } from "../../store/keyStore";

/* ─── helpers ─────────────────────────────────────────────────────────── */
const Phase = { CONFIRM: "confirm", LOADING: "loading", RESULT: "result" };

/* ─── component ───────────────────────────────────────────────────────── */
const BulkCheckoutModal = ({
  isOpen,
  onClose,
  mode,          // "take" | "return"
  selectedKeys,  // array of keyData objects (from store)
  onSuccess,     // () => void — called after a successful (or partial) operation
}) => {
  const { bulkTakeKeysAPI, bulkReturnKeysAPI } = useKeyStore();
  const [phase, setPhase] = useState(Phase.CONFIRM);
  const [result, setResult] = useState(null); // { succeeded[], failed[] }

  if (!isOpen) return null;

  const isTake = mode === "take";
  const Icon = isTake ? ArrowDownToLine : ArrowUpFromLine;
  const accentClass = isTake ? "text-indigo-400" : "text-blue-400";
  const btnClass = isTake
    ? "bg-indigo-600 hover:bg-indigo-700"
    : "bg-blue-600 hover:bg-blue-700";
  const label = isTake ? "Take" : "Return";

  const handleConfirm = async () => {
    setPhase(Phase.LOADING);
    try {
      const keyIds = selectedKeys.map((k) => k.id);
      const data = isTake
        ? await bulkTakeKeysAPI(keyIds)
        : await bulkReturnKeysAPI(keyIds);

      setResult(data);
      setPhase(Phase.RESULT);

      if (data.succeeded.length > 0) {
        onSuccess?.();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || `Bulk ${label.toLowerCase()} failed`);
      setPhase(Phase.CONFIRM);
    }
  };

  const handleClose = () => {
    setPhase(Phase.CONFIRM);
    setResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={phase !== Phase.LOADING ? handleClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-4 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2
              top-1/2 -translate-y-1/2 z-50
              bg-gray-900 border border-gray-700 rounded-2xl
              w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* ── CONFIRM ──────────────────────────────────────────── */}
            {phase === Phase.CONFIRM && (
              <div className="p-5 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700">
                      <Icon className={`w-5 h-5 ${accentClass}`} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {label} {selectedKeys.length} Key{selectedKeys.length > 1 ? "s" : ""}
                      </h2>
                      <p className="text-xs text-gray-400">Confirm bulk operation</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Key list */}
                <div className="space-y-2 mb-5 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
                  {selectedKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-700"
                    >
                      <KeyRound className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{key.keyName}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {key.keyNumber} · {key.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info note */}
                <p className="text-xs text-gray-500 mb-5">
                  {isTake
                    ? "All selected keys will be checked out to you immediately."
                    : "All selected keys will be returned to the inventory immediately."}
                  {" "}A single email summary will be sent.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 px-4 py-2.5 ${btnClass} text-white rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2`}
                  >
                    <Icon className="w-4 h-4" />
                    {label} All
                  </button>
                </div>
              </div>
            )}

            {/* ── LOADING ──────────────────────────────────────────── */}
            {phase === Phase.LOADING && (
              <div className="p-8 flex flex-col items-center gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className={`w-12 h-12 ${accentClass}`} />
                </motion.div>
                <p className="text-white font-semibold">Processing {selectedKeys.length} key{selectedKeys.length > 1 ? "s" : ""}…</p>
                <p className="text-gray-400 text-sm text-center">Please wait, this will only take a moment.</p>
              </div>
            )}

            {/* ── RESULT ───────────────────────────────────────────── */}
            {phase === Phase.RESULT && result && (
              <div className="p-5 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white">Operation Complete</h2>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Summary badges */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 flex items-center gap-2 p-3 bg-green-900/30 rounded-xl border border-green-700/50">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-green-400 text-lg font-bold leading-none">{result.succeeded.length}</p>
                      <p className="text-green-500 text-xs">Succeeded</p>
                    </div>
                  </div>
                  {result.failed.length > 0 && (
                    <div className="flex-1 flex items-center gap-2 p-3 bg-red-900/30 rounded-xl border border-red-700/50">
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div>
                        <p className="text-red-400 text-lg font-bold leading-none">{result.failed.length}</p>
                        <p className="text-red-500 text-xs">Failed</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Succeeded list */}
                {result.succeeded.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
                      ✅ Successfully {isTake ? "taken" : "returned"}
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                      {result.succeeded.map((item) => (
                        <div key={String(item.keyId)} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-white font-medium">{item.keyNumber}</span>
                          <span className="text-gray-400 truncate">{item.keyName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed list */}
                {result.failed.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
                      ❌ Could not process
                    </p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-hide">
                      {result.failed.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-white font-medium">{item.keyNumber || item.keyId}</span>
                            <span className="text-red-400 ml-2 text-xs">{item.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BulkCheckoutModal;
