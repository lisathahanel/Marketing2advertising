import React, { useEffect, useState } from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

interface AdConsentModalProps {
  onOpenPrivacy: () => void;
}

export const AdConsentModal: React.FC<AdConsentModalProps> = ({ onOpenPrivacy }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('m2a_ad_consent_v1');
    if (!consent) {
      // Delay slightly for smooth UX after splash
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('m2a_ad_consent_v1', 'accepted');
    setIsOpen(false);
  };

  const handleManage = () => {
    localStorage.setItem('m2a_ad_consent_v1', 'customized');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#14141d] border border-amber-500/30 p-5 shadow-2xl animate-in fade-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Privacy & Ad Consent</h3>
            <p className="text-xs text-slate-400">Google UMP / GDPR Compliance</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          M2A and our advertising partners use device identifiers and cookies to serve relevant ads and support free access to all our tools, live TV streams, and games.
        </p>

        <button
          onClick={onOpenPrivacy}
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mb-5 font-semibold underline underline-offset-2"
        >
          Read M2A Privacy Policy <ExternalLink className="w-3 h-3" />
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleManage}
            className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition"
          >
            Manage Options
          </button>
          <button
            onClick={handleAccept}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-xs font-black text-black shadow-lg shadow-amber-500/20 transition"
          >
            Consent & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
