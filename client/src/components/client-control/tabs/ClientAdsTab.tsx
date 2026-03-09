"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import {
  getAdsKPIData,
  getAgentActions,
  getAdsAlertsEnhanced,
  getAdsCampaignsEnhanced,
  getSpendOverTime,
  getRoasByCampaign,
  getConversionsOverTime,
} from "@/lib/client/mockAdsData";
import type { AdsKPIData } from "@/lib/client/mockAdsData";
import {
  AdsKPIBar,
  AgentActionsPanel,
  AlertsInsights,
  CampaignsTable,
  AdsChartsRow,
} from "@/components/client-control/ads";

type Props = {
  clientId: string;
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
  const cardCls = isDark ? "bg-gray-800" : "bg-white";
  const titleCls = isDark ? "text-gray-100" : "text-gray-900";
  const subtitleCls = isDark ? "text-gray-300" : "text-gray-600";
  const hintCls = isDark ? "text-gray-500" : "text-gray-500";

  const handleConnect = async () => {
    try {
      onConnecting?.(true);
      const { url } = await api.getMetaAuthUrl(clientId);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start Meta connection");
    } finally {
      onConnecting?.(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex flex-col items-center max-w-md rounded-xl border p-8 text-center shadow-sm ${
          isDark ? "border-gray-700" : "border-gray-200"
        } ${cardCls}`}
      >
        <span className="text-4xl mb-4" aria-hidden>📊</span>
        <h2 className={`text-xl font-semibold mb-2 ${titleCls}`}>No Meta Ads Connected</h2>
        <p className={`text-sm mb-6 ${subtitleCls}`}>
          Connect this client&apos;s Meta Business account to see ad performance, campaigns, and AI-powered optimization.
        </p>
        <button
          type="button"
          onClick={handleConnect}
          className="bg-[#013E99] text-white rounded-lg px-6 py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          Connect Meta Ads
        </button>
        <p className={`text-xs mt-4 ${hintCls}`}>
          Requires Meta Business Suite access for this client
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

export function ClientAdsTab({ clientId }: Props) {
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
  const [agentActions, setAgentActions] = useState(() => getAgentActions(clientId) ?? []);

  const kpiData = getAdsKPIData(clientId) ?? FALLBACK_KPI;
  const alerts = getAdsAlertsEnhanced(clientId) ?? [];
  const campaigns = getAdsCampaignsEnhanced(clientId) ?? [];
  const spendData = getSpendOverTime(clientId) ?? [];
  const roasData = getRoasByCampaign(clientId) ?? [];
  const conversionsData = getConversionsOverTime(clientId) ?? [];

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

  const handleApprove = useCallback((id: string) => {
    setAgentActions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "approved" as const, reviewedAt: new Date().toISOString(), reviewedBy: "me" } : a
      )
    );
  }, []);

  const handleReject = useCallback((id: string) => {
    setAgentActions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "rejected" as const, reviewedAt: new Date().toISOString(), reviewedBy: "me" } : a
      )
    );
  }, []);

  const bgCls = isDark ? "bg-zinc-950" : "bg-gray-50";

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

  if (connectionStatus === "not_connected") {
    return (
      <div className={`flex flex-col min-h-0 overflow-auto ${bgCls}`}>
        <ConnectMetaAdsEmptyState clientId={clientId} isDark={isDark} />
      </div>
    );
  }

  if (connectionStatus === "expired") {
    return (
      <div className={`flex flex-col min-h-0 overflow-auto ${bgCls}`}>
        <MetaExpiredState clientId={clientId} isDark={isDark} onReconnect={handleReconnect} />
      </div>
    );
  }

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
            <AgentActionsPanel
              actions={agentActions}
              onApprove={handleApprove}
              onReject={handleReject}
            />
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
          <CampaignsTable campaigns={campaigns} />
        </motion.div>
      </div>
    </div>
  );
}
