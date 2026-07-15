/**
 * BulkCheckoutModal — Collective Key Checkout & Return
 *
 * Flow: CONFIRM → QR_DISPLAY → LOADING → RESULT
 *
 * Matches the single-key QR experience exactly:
 * - True centered modal (portal, never off-screen)
 * - Countdown stops immediately when security scans
 * - Success screen auto-shown after scan (no timeout)
 * - Socket listener on 'bulk-complete' for instant faculty update
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle, XCircle, Loader2, KeyRound,
  ArrowDownToLine, ArrowUpFromLine, QrCode, RefreshCw,
} from "lucide-react";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";
import { useKeyStore } from "../../store/keyStore";
import { useAuthStore } from "../../store/authStore";
import socketService from "../../services/socketService";
import { config } from "../../utils/config";

const Phase = {
  CONFIRM:    "confirm",
  QR_DISPLAY: "qr_display",
  LOADING:    "loading",
  RESULT:     "result",
};

const BulkCheckoutModal = ({
  isOpen,
  onClose,
  mode,          // "take" | "return"
  selectedKeys,  // keyData[] from store
  onSuccess,     // () => void — called after success
}) => {
  const { bulkTakeKeysAPI, bulkReturnKeysAPI } = useKeyStore();
  const { user } = useAuthStore();

  const [phase, setPhase]         = useState(Phase.CONFIRM);
  const [result, setResult]       = useState(null);
  const [qrPayload, setQrPayload] = useState(null);
  const [secondsLeft, setSecs]    = useState(0);
  const [qrExpired, setExpired]   = useState(false);
  // Guard so we never process a bulk-complete twice
  const completedRef              = useRef(false);
  const timerRef                  = useRef(null);

  // ── Reset on close ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      clearInterval(timerRef.current);
      completedRef.current = false;
      // Delay reset so exit animation finishes
      const t = setTimeout(() => {
        setPhase(Phase.CONFIRM);
        setResult(null);
        setQrPayload(null);
        setExpired(false);
        setSecs(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Countdown while QR is displayed ─────────────────────────────────
  useEffect(() => {
    if (phase !== Phase.QR_DISPLAY || !qrPayload?.timestamp) return;
    const MAX = config.qr.validitySeconds;
    const tick = () => {
      // If already completed via socket, don't expire
      if (completedRef.current) return;
      const elapsed = Math.floor((Date.now() - new Date(qrPayload.timestamp).getTime()) / 1000);
      const left    = Math.max(0, MAX - elapsed);
      setSecs(left);
      if (left <= 0) {
        setExpired(true);
        clearInterval(timerRef.current);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [phase, qrPayload]);

  // ── Socket listener — security scanned → auto-advance ───────────────
  useEffect(() => {
    if (phase !== Phase.QR_DISPLAY || !qrPayload?.batchId) return;

    try { socketService.connect(); } catch { /* already connected */ }

    const onBulkComplete = (data) => {
      if (completedRef.current) return;
      if (data?.batchId !== qrPayload.batchId) return;

      // Matches our QR — stop countdown, mark complete, show result
      completedRef.current = true;
      clearInterval(timerRef.current);

      setResult({ succeeded: data.succeeded ?? [], failed: data.failed ?? [] });
      setPhase(Phase.RESULT);
      if ((data.succeeded?.length ?? 0) > 0) onSuccess?.();
    };

    socketService.on("bulk-complete", onBulkComplete);
    // Also catch it on the user-key-updated channel for resilience
    const onUserKeyUpdated = (data) => {
      if (data?.batchId) onBulkComplete(data);
    };
    socketService.on("userKeyUpdated", onUserKeyUpdated);

    return () => {
      socketService.off("bulk-complete", onBulkComplete);
      socketService.off("userKeyUpdated", onUserKeyUpdated);
    };
  }, [phase, qrPayload, onSuccess]);

  // ── Snapshot keys at QR-generation time ─────────────────────────────
  // selectedKeys prop may change (store update after success) — keep a
  // stable copy for the countdown/socket phase so the key list never empties.
  const snapshotRef = useRef([]);

  // The keys we actually display during QR/loading/result phases
  const displayKeys = phase === Phase.CONFIRM ? (selectedKeys ?? []) : snapshotRef.current;
  const isTake     = mode === "take";
  const Icon       = isTake ? ArrowDownToLine : ArrowUpFromLine;
  const accentHex  = isTake ? "#6366f1" : "#3b82f6";   // indigo / blue
  const label      = isTake ? "Take" : "Return";
  const mm         = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss_        = String(secondsLeft % 60).padStart(2, "0");

  const handleClose = () => {
    clearInterval(timerRef.current);
    onClose();
  };

  const handleGenerateQR = () => {
    if (!user?.id) { toast.error("Not authenticated"); return; }
    if (!selectedKeys?.length) { toast.error("No keys selected"); return; }

    // Snapshot selected keys NOW so the display never changes after store updates
    snapshotRef.current = [...selectedKeys];

    const keyIds  = snapshotRef.current.map((k) => k.id);
    const batchId = `bulk-${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type    = isTake ? "batch-request" : "batch-return";
    const idField = isTake
      ? { requestId: `req-${batchId}` }
      : { returnId:  `ret-${batchId}` };

    completedRef.current = false;
    setExpired(false);
    setSecs(config.qr.validitySeconds);
    setQrPayload({ type, keyIds, userId: user.id, batchId, timestamp: new Date().toISOString(), ...idField });
    setPhase(Phase.QR_DISPLAY);
  };

  const handleRegenerateQR = () => {
    clearInterval(timerRef.current);
    handleGenerateQR();
  };

  /** "Proceed directly" — skip QR scan */
  const callAPI = async () => {
    clearInterval(timerRef.current);
    setPhase(Phase.LOADING);
    try {
      const keyIds = selectedKeys.map((k) => k.id);
      const data   = isTake
        ? await bulkTakeKeysAPI(keyIds)
        : await bulkReturnKeysAPI(keyIds);
      setResult(data);
      setPhase(Phase.RESULT);
      if (data.succeeded.length > 0) onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || `Bulk ${label.toLowerCase()} failed. Please try again.`);
      setPhase(Phase.QR_DISPLAY);
    }
  };

  // ── Portal content ───────────────────────────────────────────────────
  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="bm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={phase !== Phase.LOADING ? handleClose : undefined}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.70)",
              zIndex: 9998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />

          {/* ── Modal — always perfectly centered ── */}
          <motion.div
            key="bm-panel"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            style={{
              position:      "fixed",
              inset:         0,
              zIndex:        9999,
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              padding:       "16px",
              pointerEvents: "none",   // clicks pass through to backdrop
            }}
          >
            {/* Inner scroll-container — pointer-events restored */}
            <div style={{
              pointerEvents:  "auto",
              background:     "#111827",
              border:         "1px solid #374151",
              borderRadius:   "18px",
              boxShadow:      "0 30px 80px rgba(0,0,0,0.7)",
              width:          "100%",
              maxWidth:       "440px",
              maxHeight:      "90dvh",
              overflowY:      "auto",
              overflowX:      "hidden",
            }}>

              {/* ════ CONFIRM ══════════════════════════════════════════ */}
              {phase === Phase.CONFIRM && (
                <div style={{ padding: "22px 24px 26px" }}>
                  {/* Header */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{
                        width:40, height:40, borderRadius:10,
                        background:"#1f2937", border:"1px solid #374151",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        <Icon style={{ width:20, height:20, color: accentHex }} />
                      </div>
                      <div>
                        <p style={{ color:"#fff", fontWeight:700, fontSize:16, margin:0 }}>
                          {label} {selectedKeys?.length ?? 0} Key{(selectedKeys?.length??0)>1?"s":""}
                        </p>
                        <p style={{ color:"#9ca3af", fontSize:12, margin:"2px 0 0" }}>Review &amp; confirm</p>
                      </div>
                    </div>
                    <button onClick={handleClose}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:6, borderRadius:8, color:"#6b7280" }}>
                      <X style={{ width:20, height:20 }} />
                    </button>
                  </div>

                  {/* Key list */}
                  <div style={{ maxHeight:180, overflowY:"auto", marginBottom:16 }}>
                    {(selectedKeys??[]).map((key) => (
                      <div key={key.id} style={{
                        display:"flex", alignItems:"center", gap:10,
                        padding:"9px 12px", marginBottom:8,
                        background:"rgba(31,41,55,0.7)", border:"1px solid #374151", borderRadius:12,
                      }}>
                        <KeyRound style={{ width:15, height:15, flexShrink:0, color:"#9ca3af" }} />
                        <div style={{ minWidth:0 }}>
                          <p style={{ color:"#fff", fontWeight:600, fontSize:14, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {key.keyName}
                          </p>
                          <p style={{ color:"#9ca3af", fontSize:12, margin:"1px 0 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {key.keyNumber} · {key.location}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Info note */}
                  <div style={{
                    display:"flex", alignItems:"flex-start", gap:8, padding:"10px 12px",
                    background:"rgba(31,41,55,0.5)", border:"1px solid #374151", borderRadius:12, marginBottom:20,
                  }}>
                    <QrCode style={{ width:15, height:15, flexShrink:0, marginTop:1, color:"#9ca3af" }} />
                    <p style={{ color:"#9ca3af", fontSize:12, lineHeight:1.55, margin:0 }}>
                      {isTake
                        ? "A QR code will be generated. Show it to security — one scan approves all selected keys."
                        : "A QR code will be generated. Show it to security — one scan returns all selected keys."}
                      {" "}A summary email will be sent automatically.
                    </p>
                  </div>

                  {/* Buttons */}
                  <div style={{ display:"flex", gap:12 }}>
                    <button onClick={handleClose}
                      style={{ flex:1, padding:"10px 16px", background:"#374151", border:"none", borderRadius:12, color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer" }}>
                      Cancel
                    </button>
                    <button onClick={handleGenerateQR}
                      style={{ flex:1, padding:"10px 16px", background:accentHex, border:"none", borderRadius:12, color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer",
                               display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <QrCode style={{ width:15, height:15 }} />
                      Generate QR
                    </button>
                  </div>
                </div>
              )}

              {/* ════ QR DISPLAY ═══════════════════════════════════════ */}
              {phase === Phase.QR_DISPLAY && (
                <div style={{ padding:"22px 24px 26px" }}>
                  {/* Header */}
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
                    <div>
                      <p style={{ color:"#fff", fontWeight:700, fontSize:16, margin:0 }}>Show to Security</p>
                      <p style={{ color:"#9ca3af", fontSize:12, margin:"2px 0 0" }}>
                        {selectedKeys?.length} key{(selectedKeys?.length??0)>1?"s":""} · one scan approves all
                      </p>
                    </div>
                    <button onClick={handleClose}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:6, borderRadius:8, color:"#6b7280" }}>
                      <X style={{ width:20, height:20 }} />
                    </button>
                  </div>

                  {/* QR or expired */}
                  {qrExpired ? (
                    <div style={{ textAlign:"center", padding:"24px 0" }}>
                      <p style={{ color:"#f87171", fontWeight:600, marginBottom:12 }}>QR Expired</p>
                      <button onClick={handleRegenerateQR}
                        style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px",
                                 background:"#374151", border:"none", borderRadius:10, color:"#fff",
                                 fontWeight:600, fontSize:14, cursor:"pointer" }}>
                        <RefreshCw style={{ width:16, height:16 }} />
                        Regenerate QR
                      </button>
                    </div>
                  ) : qrPayload ? (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, marginBottom:14 }}>
                      <div style={{ background:"#fff", padding:12, borderRadius:14, boxShadow:"0 4px 24px rgba(0,0,0,0.45)" }}>
                        <QRCode value={JSON.stringify(qrPayload)} size={200} bgColor="#ffffff" fgColor="#0f172a" />
                      </div>
                      <p style={{ fontWeight:700, fontSize:14, color: secondsLeft <= 10 ? "#f87171" : "#d1d5db" }}>
                        Expires in {mm}:{ss_}
                      </p>
                    </div>
                  ) : null}

                  {/* Key number chips */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
                    {(selectedKeys??[]).map((k) => (
                      <span key={k.id} style={{
                        display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px",
                        background:"#1f2937", border:"1px solid #374151", borderRadius:999, fontSize:12, color:"#d1d5db",
                      }}>
                        <KeyRound style={{ width:11, height:11 }} />{k.keyNumber}
                      </span>
                    ))}
                  </div>

                  {/* Divider */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <div style={{ flex:1, height:1, background:"#374151" }} />
                    <span style={{ fontSize:11, color:"#6b7280" }}>or proceed without scan</span>
                    <div style={{ flex:1, height:1, background:"#374151" }} />
                  </div>

                  {/* Skip scan button */}
                  <button onClick={callAPI}
                    style={{ width:"100%", padding:"10px 16px", background:"#374151", border:"none", borderRadius:12,
                             color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer",
                             display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <Icon style={{ width:16, height:16 }} />
                    {label} All Directly
                  </button>
                </div>
              )}

              {/* ════ LOADING ══════════════════════════════════════════ */}
              {phase === Phase.LOADING && (
                <div style={{ padding:"52px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
                  <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:"linear" }}>
                    <Loader2 style={{ width:48, height:48, color: accentHex }} />
                  </motion.div>
                  <p style={{ color:"#fff", fontWeight:700, fontSize:16, margin:0, textAlign:"center" }}>
                    Processing {selectedKeys?.length} key{(selectedKeys?.length??0)>1?"s":""}…
                  </p>
                  <p style={{ color:"#9ca3af", fontSize:13, margin:0, textAlign:"center" }}>
                    Please wait. Do not close this window.
                  </p>
                </div>
              )}

              {/* ════ RESULT ═══════════════════════════════════════════ */}
              {phase === Phase.RESULT && result && (
                <div style={{ padding:"22px 24px 26px" }}>
                  {/* Header */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <CheckCircle style={{ width:22, height:22, color:"#4ade80" }} />
                      <p style={{ color:"#fff", fontWeight:700, fontSize:16, margin:0 }}>
                        {result.succeeded.length > 0
                          ? `${result.succeeded.length} Key${result.succeeded.length>1?"s":""} ${isTake?"Issued":"Returned"} Successfully`
                          : "Operation Complete"}
                      </p>
                    </div>
                    <button onClick={handleClose}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:6, borderRadius:8, color:"#6b7280" }}>
                      <X style={{ width:20, height:20 }} />
                    </button>
                  </div>

                  {/* Count badges */}
                  <div style={{ display:"flex", gap:12, marginBottom:16 }}>
                    <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
                                  background:"rgba(6,78,59,0.3)", border:"1px solid rgba(22,163,74,0.4)", borderRadius:12 }}>
                      <CheckCircle style={{ width:20, height:20, color:"#4ade80", flexShrink:0 }} />
                      <div>
                        <p style={{ color:"#4ade80", fontWeight:700, fontSize:22, margin:0, lineHeight:1 }}>{result.succeeded.length}</p>
                        <p style={{ color:"#86efac", fontSize:12, margin:"2px 0 0" }}>Succeeded</p>
                      </div>
                    </div>
                    {result.failed.length > 0 && (
                      <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
                                    background:"rgba(127,29,29,0.3)", border:"1px solid rgba(220,38,38,0.4)", borderRadius:12 }}>
                        <XCircle style={{ width:20, height:20, color:"#f87171", flexShrink:0 }} />
                        <div>
                          <p style={{ color:"#f87171", fontWeight:700, fontSize:22, margin:0, lineHeight:1 }}>{result.failed.length}</p>
                          <p style={{ color:"#fca5a5", fontSize:12, margin:"2px 0 0" }}>Failed</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Succeeded list */}
                  {result.succeeded.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <p style={{ color:"#9ca3af", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:600, marginBottom:8 }}>
                        ✅ Successfully {isTake?"issued":"returned"}
                      </p>
                      <div style={{ maxHeight:140, overflowY:"auto" }}>
                        {result.succeeded.map((item) => (
                          <div key={String(item.keyId)} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                            <CheckCircle style={{ width:14, height:14, color:"#4ade80", flexShrink:0 }} />
                            <span style={{ color:"#fff", fontWeight:600, fontSize:13 }}>{item.keyNumber}</span>
                            <span style={{ color:"#9ca3af", fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.keyName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed list */}
                  {result.failed.length > 0 && (
                    <div style={{ marginBottom:16 }}>
                      <p style={{ color:"#9ca3af", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:600, marginBottom:8 }}>
                        ❌ Could not process
                      </p>
                      <div style={{ maxHeight:110, overflowY:"auto" }}>
                        {result.failed.map((item, i) => (
                          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}>
                            <XCircle style={{ width:14, height:14, color:"#f87171", flexShrink:0, marginTop:1 }} />
                            <div>
                              <span style={{ color:"#fff", fontWeight:600, fontSize:13 }}>{item.keyNumber||item.keyId}</span>
                              <span style={{ color:"#f87171", fontSize:11, marginLeft:6 }}>{item.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={handleClose}
                    style={{ width:"100%", padding:"11px 16px", background:"#374151", border:"none",
                             borderRadius:12, color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer" }}>
                    Done
                  </button>
                </div>
              )}

            </div>{/* /inner */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};

export default BulkCheckoutModal;
