/**
 * NotificationContent
 * Renders structured, readable content for each notification type.
 * Used in both NotificationSlidePanel (dropdown) and NotificationsPage (full page).
 */

const NotificationContent = ({ notification, compact = false }) => {
  const { type, message, metadata, title } = notification;

  // ── Daily Key Return Summary ───────────────────────────────────────────────
  if (type === 'key_summary') {
    const deptSummary = metadata?.departmentSummary || {};
    const totalKeys = metadata?.totalKeys || 0;
    const allRows = Object.entries(deptSummary).flatMap(([dept, keys]) =>
      keys.map((key) => ({ dept, ...key }))
    );

    return (
      <div className="space-y-2 mt-1">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 bg-orange-500/15 text-orange-400 text-xs font-semibold px-2 py-0.5 rounded-full">
            ⚠️ {totalKeys} Unreturned Key{totalKeys !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-500 text-xs">End of Day</span>
        </div>

        {/* Table */}
        {allRows.length > 0 && (
          <div className="rounded-lg overflow-hidden border border-white/10 text-xs">
            {/* Table header */}
            <div className="grid grid-cols-3 gap-2 px-3 py-1.5 bg-white/5 text-gray-400 font-medium uppercase tracking-wide">
              <span>Dept</span>
              <span>Key</span>
              <span>Held By</span>
            </div>
            {/* Rows — cap at 5 in compact (dropdown), show all in full page */}
            {(compact ? allRows.slice(0, 5) : allRows).map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-3 gap-2 px-3 py-1.5 border-t border-white/5 hover:bg-white/3 transition-colors"
              >
                <span className="text-blue-400 font-medium truncate">{row.dept}</span>
                <span className="text-white font-medium">
                  {row.keyNumber}
                  <span className="text-gray-500 ml-1 font-normal">({row.keyName})</span>
                </span>
                <span className="text-gray-300 truncate">{row.holder}</span>
              </div>
            ))}
            {compact && allRows.length > 5 && (
              <div className="px-3 py-1.5 border-t border-white/5 text-gray-500 text-xs">
                +{allRows.length - 5} more — click to view all
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Key Taken ──────────────────────────────────────────────────────────────
  if (type === 'key_taken') {
    return (
      <div className="space-y-2 mt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 text-xs font-semibold px-2 py-0.5 rounded-full">
            🔑 Key Taken
          </span>
          {(metadata?.keyNumber || metadata?.keyName) && (
            <span className="text-white text-xs font-semibold">
              {metadata?.keyNumber}
              {metadata?.keyName && metadata?.keyName !== metadata?.keyNumber && (
                <span className="text-gray-400 font-normal ml-1">({metadata.keyName})</span>
              )}
            </span>
          )}
        </div>
        {metadata?.facultyName && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <p className="text-gray-500 uppercase tracking-wide">Taken By</p>
              <p className="text-gray-200 font-medium mt-0.5">{metadata.facultyName}</p>
            </div>
            {metadata?.keyName && (
              <div>
                <p className="text-gray-500 uppercase tracking-wide">Key</p>
                <p className="text-gray-200 font-medium mt-0.5">{metadata.keyName}</p>
              </div>
            )}
          </div>
        )}
        {!metadata?.facultyName && (
          <p className="text-gray-300 text-xs leading-relaxed">{message}</p>
        )}
      </div>
    );
  }

  // ── Key Returned ───────────────────────────────────────────────────────────
  if (type === 'key_returned' || title === 'Key Returned') {
    return (
      <div className="space-y-2 mt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-green-500/15 text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
            ✅ Key Returned
          </span>
          {(metadata?.keyNumber || metadata?.keyName) && (
            <span className="text-white text-xs font-semibold">
              {metadata?.keyNumber}
              {metadata?.keyName && metadata?.keyName !== metadata?.keyNumber && (
                <span className="text-gray-400 font-normal ml-1">({metadata.keyName})</span>
              )}
            </span>
          )}
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">{message}</p>
      </div>
    );
  }

  // ── Key Reminder / Pending Return ──────────────────────────────────────────
  if (type === 'key_reminder' || type === 'key_pending_return') {
    const keyCount = metadata?.keyCount || metadata?.keyIds?.length || 0;
    return (
      <div className="space-y-2 mt-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-400 text-xs font-semibold px-2 py-0.5 rounded-full">
            ⏰ Return Pending
          </span>
          {keyCount > 0 && (
            <span className="text-orange-300 text-xs font-medium">
              {keyCount} key{keyCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">{message}</p>
      </div>
    );
  }

  // ── Security Alert ─────────────────────────────────────────────────────────
  if (type === 'security_alert') {
    return (
      <div className="space-y-2 mt-1">
        <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">
          🚨 Security Alert
        </span>
        <p className="text-gray-300 text-xs leading-relaxed">{message}</p>
      </div>
    );
  }

  // ── New Key Added / Key Removed (general admin events) ────────────────────
  if (type === 'general' && (title === 'New Key Added' || title === 'Key Removed')) {
    const isAdded = title === 'New Key Added';
    return (
      <div className="space-y-2 mt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isAdded ? 'bg-indigo-500/15 text-indigo-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {isAdded ? '➕ Added' : '🗑️ Removed'}
          </span>
          {(metadata?.keyNumber || metadata?.keyName) && (
            <span className="text-white text-xs font-semibold">
              {metadata?.keyNumber}
              {metadata?.keyName && metadata?.keyName !== metadata?.keyNumber && (
                <span className="text-gray-400 font-normal ml-1">({metadata.keyName})</span>
              )}
            </span>
          )}
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">{message}</p>
      </div>
    );
  }

  // ── Default fallback ───────────────────────────────────────────────────────
  return (
    <p className="text-gray-300 text-xs leading-relaxed mt-1">{message}</p>
  );
};

export default NotificationContent;
