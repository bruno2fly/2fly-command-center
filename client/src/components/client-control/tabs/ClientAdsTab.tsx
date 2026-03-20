"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import {
  getAdsKPIData,
  getAdsAlertsEnhanced,
  getAdsCampaignsEnhanced,
  getSpendOverTime,
  getRoasByCampaign,
  getConversionsOverTime,
} from "@/lib/client/mockAdsData";
import type { AdsKPIData, AdsCampaignEnhanced } from "@/lib/client/mockAdsData";
import {
  AdsKPIBar,
  AlertsInsights,
  CampaignsTable,
  AdsChartsRow,
} from "@/components/client-control/ads";
import { AgentActionsPanel } from "@/components/agent-actions";

type Props = {
  clientId: string;
  clientName?: string;
};

type ConnectionStatus = "loading" | "not_connected" | "connected" | "expired" | "needs_account_selection";

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: "easeOut" },
  }),
};

const FALLBACK_KPI: AdsKPIData = {
  spend: 0,
  spendBudget: 0,
  spendPacedPct: 0,
  spendTrend: [0, 0, 0, 0, 0, 0, 0],
  roas: 0,
  roasTrend: "—",
  roasTrendDir: "flat",
  cpa: 0,
  cpaTrend: "—",
  ctr: 0,
  ctrTrend: "—",
  conversions: 0,
  conversionsTrend: "—",
};

function ConnectMetaAdsEmptyState({
  clientId,
  isDark,
  onConnecting,
}: {
  clientId: string;
  isDark: boolean;
  onConnecting?: (v: boolean) => void;
}) {
  const [adAccountId, setAdAccountId] = useState("");
  const [adAccounts, setAdAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const cardCls = isDark ? "bg-gray-800" : "bg-white";
  const titleCls = isDark ? "text-gray-100" : "text-gray-900";
  const subtitleCls = isDark ? "text-gray-300" : "text-gray-600";
  const hintCls = isDark ? "text-gray-500" : "text-gray-500";
  const inputCls = isDark
    ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500";

  // Load available ad accounts from Meta API
  const loadAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/api/agent-tools/meta/ad-accounts?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setAdAccounts(data.accounts || []);
      }
    } catch {
      // Silent — will show manual input
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadAdAccounts();
  }, [clientId]);

  const handleQuickConnect = async (accountId: string, accountName: string) => {
    setLoading(true);
    onConnecting?.(true);
    try {
      // Create MetaConnection first
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const createRes = await fetch(`${API}/api/agent-tools/meta/quick-connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, adAccountId: accountId, adAccountName: accountName }),
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to connect");
      }
      toast.success(`Connected to ${accountName}`);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
      onConnecting?.(false);
    }
  };

  const handleManualConnect = () => {
    const id = adAccountId.trim();
    if (!id) {
      toast.error("Enter an ad account ID");
      return;
    }
    const formatted = id.startsWith("act_") ? id : `act_${id}`;
    handleQuickConnect(formatted, formatted);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex flex-col items-center max-w-lg rounded-xl border p-8 text-center shadow-sm ${
          isDark ? "border-gray-700" : "border-gray-200"
        } ${cardCls}`}
      >
        <span className="text-4xl mb-4" aria-hidden>📊</span>
        <h2 className={`text-xl font-semibold mb-2 ${titleCls}`}>Connect Meta Ads</h2>
        <p className={`text-sm mb-6 ${subtitleCls}`}>
          Select an ad account to see performance, campaigns, and AI-powered optimization.
        </p>

        {/* Available ad accounts from Meta API */}
        {loadingAccounts ? (
          <div className={`text-sm ${subtitleCls}`}>Loading ad accounts...</div>
        ) : adAccounts.length > 0 ? (
          <div className="w-full space-y-2 mb-4">
            <p className={`text-xs font-medium ${hintCls} text-left`}>Available Ad Accounts:</p>
            {adAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => handleQuickConnect(acc.id, acc.name)}
                disabled={loading}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  isDark
                    ? "border-gray-600 hover:border-blue-500 hover:bg-gray-700"
                    : "border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                } disabled:opacity-50`}
              >
                <div className={`font-medium text-sm ${titleCls}`}>{acc.name}</div>
                <div className={`text-xs ${hintCls}`}>{acc.id}</div>
              </button>
            ))}
          </div>
        ) : null}

        {/* Manual input */}
        {!showManual && adAccounts.length > 0 ? (
          <button
            onClick={() => setShowManual(true)}
            className={`text-xs ${hintCls} hover:underline mb-2`}
          >
            Or enter ad account ID manually
          </button>
        ) : (
          <div className="w-full mb-4">
            <p className={`text-xs font-medium ${hintCls} text-left mb-2`}>
              {adAccounts.length === 0 ? "Enter Ad Account ID:" : "Manual Entry:"}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="act_123456789"
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${inputCls}`}
              />
              <button
                onClick={handleManualConnect}
                disabled={loading || !adAccountId.trim()}
                className="bg-[#013E99] text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? "..." : "Connect"}
              </button>
            </div>
          </div>
        )}

        <p className={`text-xs mt-2 ${hintCls}`}>
          Find your Ad Account ID in Meta Business Suite → Settings → Ad Accounts
        </p>
      </motion.div>
    </div>
  );
}

function MetaConnectedHeader({
  adAccountName,
  clientId,
  isDark,
  onDisconnect,
}: {
  adAccountName: string;
  clientId: string;
  isDark: boolean;
  onDisconnect: () => void;
}) {
  const badgeCls = isDark
    ? "bg-emerald-950/50 text-emerald-400 border-emerald-800"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const handleDisconnect = () => {
    if (window.confirm("Disconnect Meta Ads for this client? You can reconnect anytime.")) {
      onDisconnect();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2">
      <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${badgeCls}`}>
        ✅ Connected to Meta Ads
      </span>
      <span className={isDark ? "text-[#8a7e6d]" : "text-gray-600"}>
        Ad Account: {adAccountName}
      </span>
      <button
        type="button"
        onClick={handleDisconnect}
        className="text-red-500 hover:text-red-600 text-sm font-medium"
      >
        Disconnect
      </button>
    </div>
  );
}

function MetaExpiredState({
  clientId,
  isDark,
  onReconnect,
}: {
  clientId: string;
  isDark: boolean;
  onReconnect: () => void;
}) {
  const warningCls = isDark
    ? "bg-amber-950/50 text-amber-400 border-amber-800"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className={`rounded-lg border px-4 py-3 mx-4 mb-4 ${warningCls}`}>
      <p className="font-medium">Meta Ads token expired. Reconnect.</p>
      <button
        type="button"
        onClick={onReconnect}
        className="mt-2 bg-[#013E99] text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        Reconnect
      </button>
    </div>
  );
}

function AccountPickerModal({
  accounts,
  clientId,
  isDark,
  onSelect,
  onClose,
}: {
  accounts: Array<{ id: string; name: string; status: number }>;
  clientId: string;
  isDark: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(accounts[0]?.id ?? null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    const acc = accounts.find((a) => a.id === selected);
    if (!acc) return;
    try {
      setLoading(true);
      await api.selectMetaAccount({ clientId, adAccountId: acc.id, adAccountName: acc.name });
      toast.success("Ad account connected");
      onSelect();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to select account");
    } finally {
      setLoading(false);
    }
  };

  const modalCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={`max-w-md w-full rounded-xl border p-6 shadow-xl ${modalCls}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
          Select Ad Account
        </h3>
        <div className="space-y-2 mb-6">
          {accounts.map((acc) => (
            <label
              key={acc.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                isDark ? "border-[#2a2018] hover:border-[#3a3028]" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="adAccount"
                checked={selected === acc.id}
                onChange={() => setSelected(acc.id)}
                className="text-[#013E99]"
              />
              <span className={isDark ? "text-[#c4b8a8]" : "text-gray-900"}>{acc.name}</span>
              <span className={`text-xs ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>{acc.id}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${isDark ? "text-[#8a7e6d] hover:bg-[#1a1810]" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={!selected || loading}
            className="bg-[#013E99] text-white rounded-lg px-4 py-2 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Connecting…" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

type RealAdData = Awaited<ReturnType<typeof api.getClientMain>>;

function buildKpiFromReport(report: NonNullable<RealAdData["adReports"]>[number]): AdsKPIData {
  const r = report as { spend?: number; roas?: number; ctr?: number; cpa?: number; conversions?: number };
  return {
    spend: r.spend ?? 0,
    spendBudget: 0,
    spendPacedPct: 0,
    spendTrend: [r.spend ?? 0],
    roas: r.roas ?? 0,
    roasTrend: "—",
    roasTrendDir: "flat",
    cpa: r.cpa ?? 0,
    cpaTrend: "—",
    ctr: r.ctr ?? 0,
    ctrTrend: "—",
    conversions: r.conversions ?? 0,
    conversionsTrend: "—",
  };
}

function buildCampaignsFromReal(
  clientId: string,
  adCampaigns: NonNullable<RealAdData["adCampaigns"]>
): AdsCampaignEnhanced[] {
  return adCampaigns.map((c) => ({
    id: c.id,
    clientId,
    name: c.name,
    metaCampaignId: (c as any).metaCampaignId ?? null,
    dailyBudget: c.dailyBudget ?? 0,
    spend: 0,
    roas: 0,
    cpa: 0,
    ctr: 0,
    conversions: 0,
    status: (c.status?.toLowerCase() ?? "draft") as "active" | "paused" | "completed" | "learning",
    trendData: [],
  }));
}

export function ClientAdsTab({ clientId, clientName }: Props) {
  const { isDark } = useTheme();
  const searchParams = useSearchParams();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("loading");
  const [connectionData, setConnectionData] = useState<{
    adAccountName?: string;
    adAccountId?: string;
    connectedAt?: string;
  }>({});
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; status: number }>>([]);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [realAdData, setRealAdData] = useState<RealAdData | null>(null);

  const rawKpiData = getAdsKPIData(clientId);
  const hasRealMetaData = realAdData?.metaConnection != null;
  const hasRealReports = (realAdData?.adReports?.length ?? 0) > 0;
  const useRealData = hasRealMetaData;
  const hasMockData = !useRealData && rawKpiData != null;

  const kpiData = useRealData && realAdData?.adReports?.[0]
    ? buildKpiFromReport(realAdData.adReports[0])
    : useRealData
      ? { ...FALLBACK_KPI, spend: 0, roas: 0, cpa: 0, ctr: 0, conversions: 0 }
      : (rawKpiData ?? FALLBACK_KPI);
  const alerts = getAdsAlertsEnhanced(clientId) ?? [];
  const campaigns = useRealData && realAdData?.adCampaigns?.length
    ? buildCampaignsFromReal(clientId, realAdData.adCampaigns)
    : (getAdsCampaignsEnhanced(clientId) ?? []);
  const spendData = useRealData ? (realAdData?.adReports?.map((r, i) => ({ date: `Week ${i + 1}`, spend: (r as { spend?: number }).spend ?? 0 })) ?? []) : (getSpendOverTime(clientId) ?? []);
  const roasData = useRealData ? (realAdData?.adReports?.length ? [{ name: "Meta", roas: (realAdData.adReports[0] as { roas?: number }).roas ?? 0 }] : []) : (getRoasByCampaign(clientId) ?? []);
  const conversionsData = useRealData ? (realAdData?.adReports?.map((r, i) => ({ date: `Week ${i + 1}`, conversions: (r as { conversions?: number }).conversions ?? 0 })) ?? []) : (getConversionsOverTime(clientId) ?? []);

  const realSpendZero = useRealData && (kpiData.spend ?? 0) === 0 && (realAdData?.adCampaigns?.length ?? 0) > 0;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.getMetaStatus(clientId);
      setConnectionData({
        adAccountName: res.adAccountName,
        adAccountId: res.adAccountId,
        connectedAt: res.connectedAt,
      });

      if (!res.connected) {
        if (res.status === "expired") {
          setConnectionStatus("expired");
        } else {
          setConnectionStatus("not_connected");
        }
        return;
      }

      if (!res.adAccountId) {
        const { accounts: accs } = await api.getMetaAdAccounts(clientId);
        if (accs.length > 1) {
          setAccounts(accs);
          setShowAccountPicker(true);
          setConnectionStatus("needs_account_selection");
        } else if (accs.length === 1) {
          await api.selectMetaAccount({
            clientId,
            adAccountId: accs[0].id,
            adAccountName: accs[0].name,
          });
          setConnectionData((prev) => ({ ...prev, adAccountId: accs[0].id, adAccountName: accs[0].name }));
          setConnectionStatus("connected");
        } else {
          setConnectionStatus("connected");
        }
      } else {
        setConnectionStatus("connected");
      }
    } catch {
      setConnectionStatus("not_connected");
    }
  }, [clientId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!clientId) return;
    api
      .getClientMain(clientId)
      .then((client) => {
        if (client.metaConnection != null || (client.adReports?.length ?? 0) > 0) {
          setRealAdData(client);
        } else {
          setRealAdData(null);
        }
      })
      .catch(() => setRealAdData(null));
  }, [clientId]);

  useEffect(() => {
    const connected = searchParams?.get("connected");
    const error = searchParams?.get("error");
    if (connected === "true") {
      toast.success("Meta Ads connected successfully");
      fetchStatus();
    }
    if (error) {
      const msg = error === "missing_params" ? "Missing OAuth parameters" :
        error === "server_config" ? "Server not configured for Meta" :
        error === "token_exchange" ? "Token exchange failed" :
        decodeURIComponent(error);
      toast.error(msg);
    }
  }, [searchParams, fetchStatus]);

  const handleDisconnect = async () => {
    try {
      await api.disconnectMeta(clientId);
      toast.success("Meta Ads disconnected");
      setConnectionStatus("not_connected");
      setConnectionData({});
      setRealAdData(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    }
  };

  const handleReconnect = async () => {
    try {
      const { url } = await api.getMetaAuthUrl(clientId);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start reconnect");
    }
  };

  const bgCls = isDark ? "bg-zinc-950" : "bg-gray-50";

  // Real API data > mock: show dashboard when we have real Meta connection or mock data
  // Check expired/disconnected BEFORE showing dashboard
  if (connectionStatus === "expired") {
    return (
      <div className={`flex flex-col min-h-0 overflow-auto ${bgCls}`}>
        <MetaExpiredState clientId={clientId} isDark={isDark} onReconnect={handleReconnect} />
      </div>
    );
  }

  if (connectionStatus === "not_connected") {
    return (
      <div className={`flex flex-col min-h-0 overflow-auto ${bgCls}`}>
        <ConnectMetaAdsEmptyState clientId={clientId} isDark={isDark} />
      </div>
    );
  }

  if (useRealData || hasMockData) {
    return (
      <div className={`flex flex-col min-h-0 overflow-auto ${bgCls}`}>
        {connectionStatus === "connected" && connectionData.adAccountName && (
          <MetaConnectedHeader
            adAccountName={connectionData.adAccountName}
            clientId={clientId}
            isDark={isDark}
            onDisconnect={handleDisconnect}
          />
        )}
        {realSpendZero && (
          <div className={`mx-4 mt-2 px-4 py-2 rounded-lg border text-sm ${isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
            No spend data yet. Campaign synced from Meta.
          </div>
        )}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
          <AdsKPIBar data={kpiData} />
        </motion.div>
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
          <AdsChartsRow
            spendData={spendData}
            roasData={roasData}
            conversionsData={conversionsData}
          />
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4">
          <div className="lg:col-span-7">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
              <AgentActionsPanel clientId={clientId} />
            </motion.div>
          </div>
          <div className="lg:col-span-5">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
              <AlertsInsights alerts={alerts} />
            </motion.div>
          </div>
        </div>
        <div className="flex-1 min-h-0 p-4">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4} className="h-full">
            <CampaignsTable
              campaigns={campaigns}
              clientId={clientId}
              clientName={clientName}
              adAccountId={connectionData.adAccountId}
              onRefresh={fetchStatus}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  // No mock data: check MetaConnection status
  if (connectionStatus === "loading") {
    return (
      <div className={`flex flex-col min-h-0 overflow-auto ${bgCls}`}>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className={`h-8 w-32 rounded ${isDark ? "bg-[#1a1810]" : "bg-gray-200"}`} />
            <div className={`h-4 w-48 rounded ${isDark ? "bg-[#1a1810]" : "bg-gray-200"}`} />
          </div>
        </div>
      </div>
    );
  }

  // (expired/not_connected checks moved above dashboard block)

  if (showAccountPicker && accounts.length > 1) {
    return (
      <div className={`flex flex-col min-h-0 overflow-auto ${bgCls}`}>
        <AccountPickerModal
          accounts={accounts}
          clientId={clientId}
          isDark={isDark}
          onSelect={() => {
            setShowAccountPicker(false);
            setConnectionStatus("connected");
            fetchStatus();
          }}
          onClose={() => {
            setShowAccountPicker(false);
            setConnectionStatus("connected");
          }}
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <p className={isDark ? "text-[#8a7e6d]" : "text-gray-500"}>Select an ad account above to continue.</p>
        </div>
      </div>
    );
  }

  // Connected (no mock data): show dashboard with real/fallback data
  return (
    <div className={`flex flex-col min-h-0 overflow-auto ${bgCls}`}>
      {connectionStatus === "connected" && connectionData.adAccountName && (
        <MetaConnectedHeader
          adAccountName={connectionData.adAccountName}
          clientId={clientId}
          isDark={isDark}
          onDisconnect={handleDisconnect}
        />
      )}

      {/* Section 1: Top KPI Bar */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
        <AdsKPIBar data={kpiData} />
      </motion.div>

      {/* Section 5: Quick Charts Row */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
        <AdsChartsRow
          spendData={spendData}
          roasData={roasData}
          conversionsData={conversionsData}
        />
      </motion.div>

      {/* Section 2 + 4: Agent Actions (left) + Alerts (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4">
        <div className="lg:col-span-7">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <AgentActionsPanel clientId={clientId} />
          </motion.div>
        </div>
        <div className="lg:col-span-5">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <AlertsInsights alerts={alerts} />
          </motion.div>
        </div>
      </div>

      {/* Section 3: Campaigns Table */}
      <div className="flex-1 min-h-0 p-4">
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4} className="h-full">
          <CampaignsTable
            campaigns={campaigns}
            clientId={clientId}
            clientName={clientName}
            adAccountId={connectionData.adAccountId}
            onRefresh={fetchStatus}
          />
        </motion.div>
      </div>
    </div>
  );
}
