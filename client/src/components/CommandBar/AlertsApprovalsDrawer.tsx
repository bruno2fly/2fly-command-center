"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";

export type AlertItem = {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  kind: "inbox" | "blocker";
};

export type ApprovalItem = {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertItem[];
  approvals: ApprovalItem[];
};

export function AlertsApprovalsDrawer({ isOpen, onClose, alerts, approvals }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Alerts & Approvals</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-6">
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alerts</h3>
                {alerts.length === 0 ? (
                  <p className="text-sm text-gray-500">No alerts</p>
                ) : (
                  <ul className="space-y-2">
                    {alerts.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/clients/${a.clientId}`}
                          onClick={onClose}
                          className="block p-3 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100/80"
                        >
                          <p className="text-sm font-medium text-gray-900">{a.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{a.clientName}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Approvals</h3>
                {approvals.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending approvals</p>
                ) : (
                  <ul className="space-y-2">
                    {approvals.map((a) => (
                      <li key={a.id} className="block p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <Link href={`/clients/${a.clientId}`} onClick={onClose} className="block">
                          <p className="text-sm font-medium text-gray-900">{a.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{a.clientName}</p>
                        </Link>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              toast.success(`✓ Approved - ${a.title}`);
                              onClose();
                            }}
                            className="px-2 py-1 rounded text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toast.success(`✓ Rejected - ${a.title}`);
                              onClose();
                            }}
                            className="px-2 py-1 rounded text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
