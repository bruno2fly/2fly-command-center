"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api, type ApiContentItem } from "@/lib/api";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { parseContentNotes } from "./parseContentNotes";
import { ContentIdeaFilters, type ContentIdeaFilter } from "./ContentIdeaFilters";
import { ContentIdeaCard } from "./ContentIdeaCard";
import { ApprovedContentSection } from "./ApprovedContentSection";
import { EditContentModal } from "./EditContentModal";

const IDEA_STATUSES = ["draft", "review", "idea"];
const APPROVED_STATUS = "approved";

function contentTypeToFilter(type: string): ContentIdeaFilter | null {
  const t = (type || "post").toLowerCase();
  if (t === "post" || t === "social_post") return "feed";
  if (t === "reel" || t === "reel_script") return "reels";
  if (t === "story") return "stories";
  if (t === "carousel") return "carousel";
  return "feed";
}

type Props = {
  clientId: string;
  onRefresh?: () => void;
};

export function ContentIdeasView({ clientId, onRefresh }: Props) {
  const { isDark } = useTheme();
  const { openPanel, setActiveAgent } = useAgentChat();
  const [content, setContent] = useState<ApiContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ContentIdeaFilter>("all");
  const [editingItem, setEditingItem] = useState<ApiContentItem | null>(null);

  const fetchContent = useCallback(() => {
    setLoading(true);
    api
      .getContentItemsMain(clientId)
      .then(setContent)
      .catch(() => setContent([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const ideas = useMemo(
    () => content.filter((c) => IDEA_STATUSES.includes((c.status || "").toLowerCase())),
    [content]
  );

  const approved = useMemo(
    () => content.filter((c) => (c.status || "").toLowerCase() === APPROVED_STATUS),
    [content]
  );

  const filteredIdeas = useMemo(() => {
    if (filter === "all") return ideas;
    return ideas.filter((item) => {
      const type = (item.contentType || item.type || "post").toLowerCase();
      const f = contentTypeToFilter(type);
      return f === filter;
    });
  }, [ideas, filter]);

  const handleApprove = useCallback(
    (id: string) => {
      api
        .patchContent(id, { status: "approved" })
        .then((updated) => {
          setContent((prev) => prev.map((c) => (c.id === id ? updated : c)));
          toast.success("Content approved ✅");
          onRefresh?.();
        })
        .catch(() => toast.error("Failed to approve"));
    },
    [onRefresh]
  );

  const handleReject = useCallback(
    (id: string) => {
      api
        .patchContent(id, { status: "cancelled" })
        .then((updated) => {
          setContent((prev) => prev.map((c) => (c.id === id ? updated : c)));
          toast.success("Content rejected");
          onRefresh?.();
        })
        .catch(() => toast.error("Failed to reject"));
    },
    [onRefresh]
  );

  const handleSchedule = useCallback(
    (item: ApiContentItem, dateStr: string) => {
      const iso = `${dateStr}T12:00:00.000Z`;
      api
        .patchContent(item.id, { status: "scheduled", scheduledDate: iso })
        .then((updated) => {
          setContent((prev) => prev.map((c) => (c.id === item.id ? updated : c)));
          toast.success("Content scheduled");
          onRefresh?.();
        })
        .catch(() => toast.error("Failed to schedule"));
    },
    [onRefresh]
  );

  const handleSendToTeam = useCallback(
    async (item: ApiContentItem) => {
      const parsed = parseContentNotes(item.notes ?? undefined);
      const title = `🎨 Design: ${item.title}`;
      const description = parsed.visualBrief ?? parsed.whyThisWorks ?? item.caption ?? "";
      await api.postClientTask(item.clientId, {
        title,
        description: description || undefined,
        type: "task",
        priority: "normal",
        source: "agent",
      });
    },
    []
  );

  const handleEditSuccess = useCallback(() => {
    setEditingItem(null);
    fetchContent();
    onRefresh?.();
  }, [fetchContent, onRefresh]);

  const openGenerateIdeas = useCallback(() => {
    setActiveAgent("content-system");
    openPanel();
  }, [setActiveAgent, openPanel]);

  const bgBase = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const borderCls = isDark ? "border-white/5" : "border-gray-200";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  return (
    <div className={`space-y-6 ${bgBase}`}>
      {/* AI Content Ideas */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            🤖 AI Content Ideas
          </h2>
          <ContentIdeaFilters active={filter} onSelect={setFilter} />
        </div>

        {loading ? (
          <p className={mutedCls}>Loading…</p>
        ) : filteredIdeas.length === 0 ? (
          <div
            className={`rounded-xl border ${borderCls} p-8 text-center`}
          >
            <p className={mutedCls}>
              🤖 No content ideas yet — Ask the Content Agent to generate ideas for this client.
            </p>
            <button
              type="button"
              onClick={openGenerateIdeas}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-gray-300 hover:bg-white/15 border border-white/10 transition-colors"
            >
              🧠 Generate Ideas
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredIdeas.map((item) => (
                <ContentIdeaCard
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onEdit={setEditingItem}
                  onReject={handleReject}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Divider */}
      <hr className={borderCls} />

      {/* Approved & Ready */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
          ✅ Approved & Ready to Send
        </h2>
        <ApprovedContentSection
          items={approved}
          clientId={clientId}
          onSchedule={handleSchedule}
          onSendToTeam={handleSendToTeam}
          onRefresh={onRefresh}
        />
      </section>

      {editingItem && (
        <EditContentModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
