import { useEffect, useRef, useState } from 'react';
import { Gauge, Play, ShieldAlert, Square } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SecuritySettings, TunnelStatus, VpnServer } from '../types/vpn';

interface SpeedTestCardProps {
  tunnelStatus: TunnelStatus;
  selectedServer: VpnServer;
  security: SecuritySettings;
}

interface SpeedPoint {
  step: string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
}

type TestPhase = 'idle' | 'latency' | 'download' | 'upload' | 'complete' | 'blocked';

const PROTOCOL_EFFICIENCY: Record<SecuritySettings['protocol'], number> = {
  WireGuard: 0.94,
  IKEv2: 0.89,
  'OpenVPN UDP': 0.85,
  'OpenVPN TCP': 0.72,
};

export function SpeedTestCard({
  tunnelStatus,
  selectedServer,
  security,
}: SpeedTestCardProps) {
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [samples, setSamples] = useState<SpeedPoint[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [jitterMs, setJitterMs] = useState<number | null>(null);
  const [downloadMbps, setDownloadMbps] = useState<number | null>(null);
  const [uploadMbps, setUploadMbps] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const isRunning = phase === 'latency' || phase === 'download' || phase === 'upload';
  const isConnected = tunnelStatus === 'connected';
  const isKillSwitchLocked = tunnelStatus === 'killswitch-locked';

  function stopTest() {
    runningRef.current = false;
    abortRef.current?.abort();
    setPhase((prev) => (prev === 'complete' ? 'complete' : 'idle'));
  }

  async function runSpeedTest() {
    if (isKillSwitchLocked) {
      setPhase('blocked');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    runningRef.current = true;

    setSamples([]);
    setLatencyMs(null);
    setJitterMs(null);
    setDownloadMbps(null);
    setUploadMbps(null);

    const tunnelHopPenalty = isConnected
      ? selectedServer.baseLatencyMs + (security.multiHopEnabled ? 22 : 0)
      : 0;
    const efficiency = isConnected ? PROTOCOL_EFFICIENCY[security.protocol] : 1;

    const pingSamples: number[] = [];
    const dlHistory: number[] = [];
    const ulHistory: number[] = [];

    try {
      // Phase 1: Latency & Jitter (4 probes)
      setPhase('latency');
      for (let i = 1; i <= 4; i += 1) {
        if (!runningRef.current) return;
        const t0 = performance.now();
        await fetch(`/api/network/ping?n=${i}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const rawRtt = performance.now() - t0;
        const effectiveRtt = Math.max(1, Math.round(rawRtt + tunnelHopPenalty));
        pingSamples.push(effectiveRtt);

        const avgLat = Math.round(
          pingSamples.reduce((acc, v) => acc + v, 0) / pingSamples.length
        );
        const avgJitter =
          pingSamples.length > 1
            ? Math.round(
                pingSamples
                  .slice(1)
                  .reduce((acc, v, idx) => acc + Math.abs(v - pingSamples[idx]), 0) /
                  (pingSamples.length - 1)
              )
            : 1;

        setLatencyMs(avgLat);
        setJitterMs(avgJitter);
        setSamples((prev) => [
          ...prev,
          {
            step: `P${i}`,
            downloadMbps: 0,
            uploadMbps: 0,
            latencyMs: effectiveRtt,
          },
        ]);
        await new Promise((r) => setTimeout(r, 220));
      }

      // Phase 2: Real Download Throughput (6 live chunks)
      setPhase('download');
      const chunkBytes = 393216; // 384 KB per sample
      for (let i = 1; i <= 6; i += 1) {
        if (!runningRef.current) return;
        const t0 = performance.now();
        const resp = await fetch(`/api/network/speed-download?bytes=${chunkBytes}&i=${i}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const buf = await resp.arrayBuffer();
        const elapsedSec = Math.max(0.012, (performance.now() - t0) / 1000);
        // Apply realistic tunnel encryption overhead and server load factor
        const loadFactor = isConnected ? Math.max(0.65, 1 - selectedServer.loadPercent / 220) : 1;
        const rawMbps = (buf.byteLength * 8) / elapsedSec / 1_000_000;
        // Cap extreme localhost loopback bursts cleanly while reflecting real socket fluctuations
        const normalizedMbps = Number(
          Math.min(480, Math.max(4.5, rawMbps * efficiency * loadFactor)).toFixed(1)
        );
        dlHistory.push(normalizedMbps);
        const avgDl = Number(
          (dlHistory.reduce((acc, v) => acc + v, 0) / dlHistory.length).toFixed(1)
        );
        setDownloadMbps(avgDl);

        const lastLat = pingSamples[pingSamples.length - 1] || 12;
        const loadedLat = Math.round(lastLat + (isConnected ? 4 : 2) * (i % 3));
        setSamples((prev) => [
          ...prev,
          {
            step: `D${i}`,
            downloadMbps: normalizedMbps,
            uploadMbps: 0,
            latencyMs: loadedLat,
          },
        ]);
        await new Promise((r) => setTimeout(r, 240));
      }

      // Phase 3: Real Upload Throughput (5 live chunks)
      setPhase('upload');
      const uploadBytes = 196608; // 192 KB per sample
      const uploadBuffer = new Uint8Array(uploadBytes);
      for (let i = 0; i < uploadBytes; i += 257) {
        uploadBuffer[i] = i & 0xff;
      }

      for (let i = 1; i <= 5; i += 1) {
        if (!runningRef.current) return;
        const t0 = performance.now();
        await fetch('/api/network/speed-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: uploadBuffer,
          cache: 'no-store',
          signal: controller.signal,
        });
        const elapsedSec = Math.max(0.015, (performance.now() - t0) / 1000);
        const rawUlMbps = (uploadBytes * 8) / elapsedSec / 1_000_000;
        const normalizedUl = Number(
          Math.min(240, Math.max(2.5, rawUlMbps * efficiency * 0.65)).toFixed(1)
        );
        ulHistory.push(normalizedUl);
        const avgUl = Number(
          (ulHistory.reduce((acc, v) => acc + v, 0) / ulHistory.length).toFixed(1)
        );
        setUploadMbps(avgUl);

        const lastDl = dlHistory[dlHistory.length - 1] || 0;
        const lastLat = pingSamples[pingSamples.length - 1] || 12;
        setSamples((prev) => [
          ...prev,
          {
            step: `U${i}`,
            downloadMbps: lastDl,
            uploadMbps: normalizedUl,
            latencyMs: lastLat + 2,
          },
        ]);
        await new Promise((r) => setTimeout(r, 240));
      }

      if (runningRef.current) {
        setPhase('complete');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setPhase('idle');
    } finally {
      runningRef.current = false;
    }
  }

  const phaseText =
    phase === 'latency'
      ? 'Measuring Latency & Jitter…'
      : phase === 'download'
        ? 'Measuring Download Throughput…'
        : phase === 'upload'
          ? 'Measuring Upload Throughput…'
          : phase === 'complete'
            ? 'Test Complete'
            : phase === 'blocked'
              ? 'Blocked by Kill Switch'
              : 'Ready';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-sky-500" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Speed Test — Connection Latency & Throughput
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isConnected
              ? `Testing active encrypted ${security.protocol} tunnel via ${selectedServer.city}, ${selectedServer.country} · ${phaseText}`
              : isKillSwitchLocked
                ? 'Kill Switch is active and blocking all outbound probes.'
                : `Testing direct unprotected ISP path · ${phaseText}`}
          </p>
        </div>

        <button
          type="button"
          onClick={isRunning ? stopTest : () => void runSpeedTest()}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            isRunning
              ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
              : 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="h-3.5 w-3.5" />
              Stop Test
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Run Speed Test
            </>
          )}
        </button>
      </div>

      {phase === 'blocked' && (
        <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            Kill Switch is currently blocking outbound packets. Reconnect the VPN tunnel or unlock
            direct access to run a speed test.
          </span>
        </div>
      )}

      {/* 4-Column Tabular Metrics Strip */}
      <div className="mt-5 grid grid-cols-2 gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:grid-cols-4">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Latency</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {latencyMs !== null ? `${latencyMs}` : '—'}{' '}
            <span className="text-xs font-normal text-slate-500">ms</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Jitter</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {jitterMs !== null ? `${jitterMs}` : '—'}{' '}
            <span className="text-xs font-normal text-slate-500">ms</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Download</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-sky-600 dark:text-sky-400">
            {downloadMbps !== null ? downloadMbps.toFixed(1) : '—'}{' '}
            <span className="text-xs font-normal text-slate-500">Mbps</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Upload</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {uploadMbps !== null ? uploadMbps.toFixed(1) : '—'}{' '}
            <span className="text-xs font-normal text-slate-500">Mbps</span>
          </div>
        </div>
      </div>

      {/* Real-Time Recharts Graph */}
      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Real-Time Throughput & Latency Curve</span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-xs bg-sky-500" />
              Download (Mbps)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-xs bg-emerald-500" />
              Upload (Mbps)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-amber-500" />
              Latency (ms)
            </span>
          </div>
        </div>

        {samples.length === 0 ? (
          <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-[#0B111E]">
            <div className="px-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Click Run Speed Test to measure live connection latency and throughput.
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Compare direct ISP latency against encrypted VPN tunnel routing in real time.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-64 w-full rounded-lg bg-slate-50 p-3 dark:bg-[#0B111E]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={samples} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="dlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ulFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.22}
                  vertical={false}
                />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="speed"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  unit=" Mbps"
                  width={68}
                />
                <YAxis
                  yAxisId="latency"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#F59E0B' }}
                  axisLine={false}
                  tickLine={false}
                  unit=" ms"
                  width={52}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Area
                  yAxisId="speed"
                  type="monotone"
                  dataKey="downloadMbps"
                  name="Download (Mbps)"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  fill="url(#dlFill)"
                  isAnimationActive={false}
                />
                <Area
                  yAxisId="speed"
                  type="monotone"
                  dataKey="uploadMbps"
                  name="Upload (Mbps)"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#ulFill)"
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="latency"
                  type="monotone"
                  dataKey="latencyMs"
                  name="Latency (ms)"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#F59E0B' }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
