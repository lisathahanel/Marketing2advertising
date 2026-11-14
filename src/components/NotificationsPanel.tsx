import React, { useEffect, useState } from 'react';
import { Bell, BellRing, CheckCircle2, X, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    __M2A_ONESIGNAL_READY__?: Promise<any>;
  }
}

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;

function loadOneSignal() {
  if (window.__M2A_ONESIGNAL_READY__) return window.__M2A_ONESIGNAL_READY__;
  return Promise.reject(new Error('OneSignal has not initialized. Check the site configuration and service worker.'));
}

export const NotificationsPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  const configured = Boolean(ONESIGNAL_APP_ID && ONESIGNAL_APP_ID.trim());

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
  }, [open]);

  if (!open) return null;

  const enable = async () => {
    if (!configured) {
      setMessage('Push service is not connected yet. M2A needs its OneSignal App ID before subscriptions can be activated.');
      return;
    }
    if (!('Notification' in window)) {
      setMessage('This browser does not support push notifications. Try installing M2A and opening it in a supported browser.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const OneSignal = await loadOneSignal();
      await OneSignal.Notifications.requestPermission();
      const current = Notification.permission;
      setPermission(current);
      if (current === 'granted') {
        // Close the panel as soon as the visitor grants browser permission.
        // Continue completing the OneSignal subscription in the background.
        onClose();
        // The browser permission prompt can finish before OneSignal completes
        // its push subscription. Bound the wait so the button never spins forever.
        await Promise.race([
          OneSignal.User.PushSubscription.optIn(),
          new Promise((_, reject) => window.setTimeout(
            () => reject(new Error('Push subscription is taking longer than expected.')),
            10000
          ))
        ]);
        setSubscriptionReady(true);
        setMessage('Notifications are enabled on this device. You can manage permission in your browser settings.');
      } else if (current === 'denied') {
        setMessage('Notifications are blocked in browser settings. Change the site permission to allow them.');
      } else {
        setMessage('Permission was not granted. You can enable it any time from this screen.');
      }
    } catch (error) {
      console.error('M2A push subscription error:', error);
      const detail = error instanceof Error ? error.message : 'Please try again.';
      setMessage(Notification.permission === 'granted'
        ? `Browser permission is granted, but push setup did not finish. ${detail}`
        : `Could not connect to the push service. ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="m2a-notifications-title">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-lime-300/20 bg-[#0d1420] shadow-[0_25px_90px_rgba(0,0,0,.65)]">
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300"><BellRing className="h-6 w-6" /></div>
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">M2A Alerts</p><h2 id="m2a-notifications-title" className="mt-1 text-xl font-black text-white">Get Notified</h2></div>
          </div>
          <button onClick={onClose} aria-label="Close notifications" className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-300">Get important M2A updates on this device when new movies, series, articles, or announcements are published.</p>
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4 text-lime-300" /> Your choice, your device</div>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">Notifications are optional. You can turn them off any time in your browser or device settings.</p>
          </div>
          {permission === 'granted' && configured && <p className="flex items-center gap-2 text-sm font-semibold text-lime-300"><CheckCircle2 className="h-4 w-4" /> Browser permission is allowed on this device.</p>}
          {message && <p className="rounded-xl border border-lime-300/15 bg-lime-300/[.06] p-3 text-sm leading-5 text-slate-200">{message}</p>}
          {!configured && <p className="text-xs leading-5 text-amber-200/80">Setup stage: the push provider must be connected before subscriptions can receive real alerts.</p>}
          <button onClick={() => void enable()} disabled={busy || subscriptionReady} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7CFF00] px-4 py-3 text-sm font-black text-[#071000] transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60">
            <Bell className="h-4 w-4" /> {busy ? 'Connecting…' : subscriptionReady ? 'Notifications Enabled' : permission === 'granted' && configured ? 'Finish Notification Setup' : 'Enable Notifications'}
          </button>
          <button onClick={onClose} className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5">Maybe later</button>
        </div>
      </div>
    </div>
  );
};
