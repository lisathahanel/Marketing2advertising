import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Globe,
  Search,
  Star,
} from 'lucide-react';
import type { TunnelStatus, VpnServer } from '../types/vpn';

interface ServersViewProps {
  servers: VpnServer[];
  selectedServer: VpnServer;
  entryServer: VpnServer | null;
  multiHopEnabled: boolean;
  tunnelStatus: TunnelStatus;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onSelectServer: (server: VpnServer) => void;
  onSelectEntryServer: (server: VpnServer) => void;
  onToggleMultiHop: (enabled: boolean) => void;
}

type RegionFilter =
  | 'All'
  | 'Americas'
  | 'Europe'
  | 'Asia-Pacific'
  | 'Middle East & Africa'
  | 'Favorites';
type CapabilityFilter = 'All' | 'Multi-Hop' | 'Streaming' | 'P2P';
type SortKey = 'latency' | 'load' | 'country';

export function ServersView({
  servers,
  selectedServer,
  entryServer,
  multiHopEnabled,
  tunnelStatus,
  favoriteIds,
  onToggleFavorite,
  onSelectServer,
  onSelectEntryServer,
  onToggleMultiHop,
}: ServersViewProps) {
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('All');
  const [capabilityFilter, setCapabilityFilter] = useState<CapabilityFilter>('All');
  const [sortBy, setSortBy] = useState<SortKey>('latency');

  const filteredServers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return servers
      .filter((s) => {
        if (regionFilter === 'Favorites' && !favoriteIds.includes(s.id)) return false;
        if (
          regionFilter !== 'All' &&
          regionFilter !== 'Favorites' &&
          s.region !== regionFilter
        ) {
          return false;
        }
        if (capabilityFilter === 'Multi-Hop' && !s.multiHopReady) return false;
        if (capabilityFilter === 'Streaming' && !s.streamingOptimized) return false;
        if (capabilityFilter === 'P2P' && !s.p2pAllowed) return false;

        if (!q) return true;
        return (
          s.city.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          s.countryCode.toLowerCase().includes(q) ||
          s.exitIp.includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'latency') return a.baseLatencyMs - b.baseLatencyMs;
        if (sortBy === 'load') return a.loadPercent - b.loadPercent;
        return a.country.localeCompare(b.country);
      });
  }, [servers, query, regionFilter, capabilityFilter, sortBy, favoriteIds]);

  const multiHopCandidates = useMemo(
    () => servers.filter((s) => s.multiHopReady && s.id !== selectedServer.id),
    [servers, selectedServer.id]
  );

  return (
    <div className="space-y-6">
      {/* Multi-Hop Double VPN Configuration Strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-sky-500" />
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Multi-Hop Routing (Double Encryption)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Chain your traffic through two independent jurisdictions so neither node sees both your
              origin IP and your destination.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={multiHopEnabled}
            onClick={() => onToggleMultiHop(!multiHopEnabled)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              multiHopEnabled
                ? 'bg-sky-600 text-white dark:bg-sky-500 dark:text-slate-950'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {multiHopEnabled ? 'Multi-Hop Enabled' : 'Enable Multi-Hop'}
          </button>
        </div>

        {multiHopEnabled && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-2">
            <div>
              <label
                htmlFor="entry-node-select"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                Entry Node (First Hop)
              </label>
              <select
                id="entry-node-select"
                value={entryServer?.id || multiHopCandidates[0]?.id || ''}
                onChange={(e) => {
                  const found = servers.find((s) => s.id === e.target.value);
                  if (found) onSelectEntryServer(found);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {multiHopCandidates.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.city}, {node.country} ({node.baseLatencyMs} ms)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Exit Node (Geo-IP Destination)
              </div>
              <div className="mt-1.5 flex h-[38px] items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-[#0B111E] dark:text-slate-100">
                <span>
                  {selectedServer.city}, {selectedServer.country}
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {selectedServer.exitIp}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Server Directory Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]">
        <div className="space-y-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Global Exit Locations ({filteredServers.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select any location to simulate browsing from that country and bypass regional
                content restrictions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter city, country, or IP…"
                  aria-label="Filter server locations"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Sort servers"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="latency">Sort: Lowest Latency</option>
                <option value="load">Sort: Lowest Load</option>
                <option value="country">Sort: Country A–Z</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
              {(
                [
                  'All',
                  'Americas',
                  'Europe',
                  'Asia-Pacific',
                  'Middle East & Africa',
                  'Favorites',
                ] as RegionFilter[]
              ).map(
                (region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setRegionFilter(region)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      regionFilter === region
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {region}
                  </button>
                )
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
              {(['All', 'Streaming', 'Multi-Hop', 'P2P'] as CapabilityFilter[]).map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setCapabilityFilter(cap)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    capabilityFilter === cap
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {cap === 'All' ? 'All Capabilities' : cap}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Globe className="h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              No matching server locations
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Clear your search filter or switch regions to view all available exit nodes.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setRegionFilter('All');
                setCapabilityFilter('All');
              }}
              className="mt-4 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-3 pr-3 pl-5">Location</th>
                  <th className="px-3 py-3">Exit IPv4</th>
                  <th className="px-3 py-3">Capabilities & Hardware</th>
                  <th className="px-3 py-3 text-right">Load</th>
                  <th className="px-3 py-3 text-right">Latency</th>
                  <th className="py-3 pr-5 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredServers.map((server) => {
                  const isSelected = server.id === selectedServer.id;
                  const isActive = isSelected && tunnelStatus === 'connected';
                  const isFav = favoriteIds.includes(server.id);

                  const capabilities = [
                    server.ramOnly ? 'RAM-Only' : null,
                    server.streamingOptimized ? 'Geo-Streaming' : null,
                    server.multiHopReady ? 'Multi-Hop' : null,
                    server.p2pAllowed ? 'P2P' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <tr
                      key={server.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 pr-3 pl-5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(server.id)}
                            aria-label={
                              isFav
                                ? `Remove ${server.city} from favorites`
                                : `Add ${server.city} to favorites`
                            }
                            className="text-slate-400 transition-colors hover:text-amber-500"
                          >
                            <Star
                              className={`h-4 w-4 ${
                                isFav ? 'fill-amber-400 text-amber-400' : ''
                              }`}
                            />
                          </button>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {server.city}, {server.country}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {server.ownership} · {server.bandwidthGbps} Gbps
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {server.exitIp}
                      </td>

                      <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {capabilities}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                server.loadPercent > 70
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${server.loadPercent}%` }}
                            />
                          </div>
                          <span className="w-8 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                            {server.loadPercent}%
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                        {server.baseLatencyMs} ms
                      </td>

                      <td className="py-3 pr-5 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectServer(server)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            isActive
                              ? 'bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                              : isSelected
                                ? 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950'
                                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Connected
                            </>
                          ) : (
                            'Connect'
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
