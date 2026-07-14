import { QrCode } from "lucide-react";
import { useOutletContext } from "react-router-dom";

const QRScannerPage = () => {
  const { setShowScanner } = useOutletContext();
  return (
    <div className="flex-1 p-4 pb-20">
      <div className="text-center max-w-sm mx-auto mt-8 mb-8">
        <QrCode className="w-20 h-20 md:w-24 md:h-24 text-blue-400 mx-auto mb-5 md:mb-6" />

        <h2 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">QR Scanner</h2>
        <p className="text-gray-300 text-sm md:text-base mb-6 md:mb-8">
          Scan QR codes from faculty to approve key requests or returns
        </p>
        <button
          onClick={() => setShowScanner(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 md:px-8 md:py-4
            rounded-xl font-semibold text-base md:text-lg transition-colors
            flex items-center gap-3 mx-auto shadow-lg shadow-blue-500/30 min-h-[52px]"
        >
          <QrCode className="w-5 h-5 md:w-6 md:h-6 text-blue-200" />
          Start Scanning
        </button>
      </div>
    </div>
  );
};


export default QRScannerPage;
