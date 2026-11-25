import { useMemo, useState } from 'react';
import type { TunnelStatus, VpnServer } from '../types/vpn';

interface WorldNodeMapProps {
  servers: VpnServer[];
  selectedServer: VpnServer;
  entryServer: VpnServer | null;
  multiHopEnabled: boolean;
  tunnelStatus: TunnelStatus;
  onSelectServer: (server: VpnServer) => void;
  originCity: string;
}

type MapFocus = 'Global' | 'Americas' | 'Europe' | 'Asia-Pacific' | 'MEA';

const MAP_VIEWBOXES: Record<MapFocus, string> = {
  Global: '0 0 1000 470',
  Americas: '80 55 370 365',
  Europe: '405 38 205 160',
  'Asia-Pacific': '635 75 335 340',
  MEA: '440 130 245 255',
};

function projectCoords([lon, lat]: [number, number]): [number, number] {
  const x = ((lon + 180) / 360) * 1000;
  const clampedLat = Math.max(-60, Math.min(78, lat));
  const y = ((80 - clampedLat) / 145) * 470;
  return [x, y];
}

function buildCurvePath(from: [number, number], to: [number, number]): string {
  const midX = (from[0] + to[0]) / 2;
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const arcLift = Math.min(90, Math.max(24, dist * 0.22));
  const midY = Math.min(from[1], to[1]) - arcLift;
  return `M ${from[0].toFixed(1)} ${from[1].toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${to[0].toFixed(1)} ${to[1].toFixed(1)}`;
}

// Simplified, geographically accurate continental silhouettes on 1000x470 equirectangular canvas
const CONTINENT_PATHS = [
  // North America
  'M 65 92 L 105 68 L 165 62 L 228 66 L 275 82 L 320 94 L 302 126 L 285 138 L 298 158 L 276 184 L 254 202 L 238 225 L 245 248 L 222 252 L 204 236 L 182 224 L 165 198 L 145 168 L 116 142 L 78 122 Z',
  // Greenland
  'M 340 24 L 408 18 L 424 44 L 392 74 L 348 64 Z',
  // South America
  'M 252 260 L 292 258 L 336 286 L 368 318 L 352 356 L 322 396 L 302 442 L 284 446 L 276 404 L 274 352 L 254 316 L 244 282 Z',
  // Europe
  'M 455 138 L 466 112 L 496 86 L 535 72 L 575 78 L 584 106 L 568 134 L 542 146 L 516 148 L 492 154 L 468 150 Z',
  // UK & Ireland
  'M 464 104 L 478 96 L 484 118 L 468 124 Z',
  // Africa
  'M 466 168 L 518 164 L 564 182 L 598 224 L 584 268 L 566 318 L 542 368 L 516 364 L 502 318 L 490 278 L 456 244 L 448 202 Z',
  // Asia
  'M 578 78 L 656 58 L 748 56 L 844 68 L 916 86 L 892 122 L 856 146 L 832 184 L 802 204 L 774 228 L 748 214 L 716 232 L 684 218 L 642 202 L 604 188 L 582 154 L 576 112 Z',
  // Japan
  'M 868 128 L 882 122 L 888 148 L 872 162 Z',
  // SE Asia Islands (Indonesia/Philippines)
  'M 758 248 L 812 246 L 838 264 L 792 270 L 756 260 Z',
  // Australia & New Zealand
  'M 804 328 L 874 318 L 918 348 L 908 394 L 858 402 L 810 384 Z',
  'M 936 392 L 952 384 L 948 416 L 932 420 Z',
];

export function WorldNodeMap({
  servers,
  selectedServer,
  entryServer,
  multiHopEnabled,
  tunnelStatus,
  onSelectServer,
  originCity,
}: WorldNodeMapProps) {
  const [focus, setFocus] = useState<MapFocus>('Global');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Origin approximate anchor (London/Western Europe baseline)
  const originPoint = useMemo<[number, number]>(() => projectCoords([-3.2, 48.5]), []);
  const exitPoint = useMemo<[number, number]>(
    () => projectCoords(selectedServer.coordinates),
    [selectedServer]
  );
  const entryPoint = useMemo<[number, number] | null>(
    () => (multiHopEnabled && entryServer ? projectCoords(entryServer.coordinates) : null),
    [multiHopEnabled, entryServer]
  );

  const hoveredServer = useMemo(
    () => servers.find((s) => s.id === hoveredId) || null,
    [servers, hoveredId]
  );

  const isConnected = tunnelStatus === 'connected';
  const isConnecting = tunnelStatus === 'connecting';

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Encrypted Route Topology
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {multiHopEnabled && entryServer
              ? `${originCity} → ${entryServer.city} (Entry) → ${selectedServer.city} (Exit)`
              : `${originCity} → ${selectedServer.city}, ${selectedServer.country} (${selectedServer.exitIp})`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
          {(['Global', 'Americas', 'Europe', 'Asia-Pacific', 'MEA'] as MapFocus[]).map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => setFocus(region)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                focus === region
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden p-4">
        <svg
          viewBox={MAP_VIEWBOXES[focus]}
          className="h-[290px] w-full select-none rounded-lg bg-slate-50 transition-all duration-300 dark:bg-[#0B111E]"
          role="img"
          aria-label="Global VPN server node map"
        >
          {/* Subtle coordinate graticule */}
          <g stroke="currentColor" className="text-slate-200/70 dark:text-slate-800/60" strokeWidth="0.6">
            <line x1="0" y1="155" x2="1000" y2="155" strokeDasharray="3 4" />
            <line x1="0" y1="260" x2="1000" y2="260" strokeDasharray="3 4" />
            <line x1="0" y1="365" x2="1000" y2="365" strokeDasharray="3 4" />
            <line x1="250" y1="0" x2="250" y2="470" strokeDasharray="3 4" />
            <line x1="500" y1="0" x2="500" y2="470" strokeDasharray="3 4" />
            <line x1="750" y1="0" x2="750" y2="470" strokeDasharray="3 4" />
          </g>

          {/* Continents */}
          <g
            className="fill-slate-200/80 stroke-slate-300 dark:fill-[#162033] dark:stroke-[#23324D]"
            strokeWidth="1"
          >
            {CONTINENT_PATHS.map((d, idx) => (
              <path key={idx} d={d} />
            ))}
          </g>

          {/* Tunnel Route Arcs */}
          {entryPoint ? (
            <>
              <path
                d={buildCurvePath(originPoint, entryPoint)}
                fill="none"
                stroke={isConnected ? '#10B981' : isConnecting ? '#0EA5E9' : '#64748B'}
                strokeWidth={isConnected ? 2 : 1.5}
                strokeDasharray="6 6"
                className={isConnected || isConnecting ? 'animate-tunnel-flow' : ''}
                opacity={isConnected || isConnecting ? 0.9 : 0.4}
              />
              <path
                d={buildCurvePath(entryPoint, exitPoint)}
                fill="none"
                stroke={isConnected ? '#10B981' : isConnecting ? '#0EA5E9' : '#64748B'}
                strokeWidth={isConnected ? 2.2 : 1.5}
                strokeDasharray="6 6"
                className={isConnected || isConnecting ? 'animate-tunnel-flow' : ''}
                opacity={isConnected || isConnecting ? 0.95 : 0.45}
              />
            </>
          ) : (
            <path
              d={buildCurvePath(originPoint, exitPoint)}
              fill="none"
              stroke={isConnected ? '#10B981' : isConnecting ? '#0EA5E9' : '#64748B'}
              strokeWidth={isConnected ? 2.2 : 1.5}
              strokeDasharray="6 6"
              className={isConnected || isConnecting ? 'animate-tunnel-flow' : ''}
              opacity={isConnected || isConnecting ? 0.95 : 0.45}
            />
          )}

          {/* Origin Marker */}
          <g transform={`translate(${originPoint[0]}, ${originPoint[1]})`}>
            <circle r="7" className="fill-slate-400/20 dark:fill-slate-300/15" />
            <circle r="3.5" className="fill-slate-700 stroke-white dark:fill-slate-200 dark:stroke-[#0B111E]" strokeWidth="1.5" />
          </g>

          {/* Server Nodes */}
          {servers.map((server) => {
            const [x, y] = projectCoords(server.coordinates);
            const isSelected = server.id === selectedServer.id;
            const isEntry = multiHopEnabled && entryServer?.id === server.id;
            const isHovered = hoveredId === server.id;

            return (
              <g
                key={server.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Select ${server.city}, ${server.country} VPN server`}
                onClick={() => onSelectServer(server)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectServer(server);
                  }
                }}
                onMouseEnter={() => setHoveredId(server.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <circle r="13" fill="transparent" />
                {(isSelected || isEntry) && (
                  <circle
                    r={isSelected ? 10 : 8}
                    className={
                      isSelected && isConnected
                        ? 'fill-emerald-500/20'
                        : isEntry
                          ? 'fill-sky-500/20'
                          : 'fill-sky-500/15'
                    }
                  />
                )}
                <circle
                  r={isSelected ? 5 : isEntry ? 4.5 : isHovered ? 4.5 : 3.4}
                  className={
                    isSelected
                      ? isConnected
                        ? 'fill-emerald-500 stroke-white dark:stroke-[#0B111E]'
                        : 'fill-sky-500 stroke-white dark:stroke-[#0B111E]'
                      : isEntry
                        ? 'fill-sky-400 stroke-white dark:stroke-[#0B111E]'
                        : 'fill-slate-500 stroke-white hover:fill-sky-400 dark:fill-slate-400 dark:stroke-[#0B111E]'
                  }
                  strokeWidth="1.5"
                />
                {(isSelected || isEntry || focus !== 'Global') && (
                  <text
                    x="8"
                    y="3"
                    className="fill-slate-700 text-[9px] font-medium dark:fill-slate-300"
                    style={{ pointerEvents: 'none' }}
                  >
                    {server.city}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hoveredServer && (
          <div className="pointer-events-none absolute bottom-6 left-6 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur-xs dark:border-slate-700 dark:bg-slate-900/95">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {hoveredServer.city}, {hoveredServer.country}
            </div>
            <div className="mt-0.5 flex items-center gap-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>{hoveredServer.exitIp}</span>
              <span aria-hidden="true">·</span>
              <span>{hoveredServer.baseLatencyMs} ms</span>
              <span aria-hidden="true">·</span>
              <span>{hoveredServer.loadPercent}% load</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
