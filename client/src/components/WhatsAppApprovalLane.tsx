"use client";

/**
 * "Needs Review" approval lane with Approve/Dismiss cards.
 */

import { useState } from "react";

interface PendingRequest {
  id: string;
  rawMessage: string;
  senderName: string;
  senderId: string;
  senderPhone: string;
  classification: {
    isRequest: boolean;
    intent: string;
    confidence: number;
    summary: string;
    method: string;
    matchedPatterns?: string[];
  };
  timestamp: number;
  createdAt: number;
  status: string;
  mediaUrls: string[];
}

interface WhatsAppApprovalLaneProps {
  requests: PendingRequest[];
  onApprove: (id: string, lane: 'NOW' | 'NEXT' | 'LATER') => void;
  onDismiss: (id: string, reason?: string) => void;
  loading?: boolean;
}

const INTENT_COLORS: Record<string, string> = {
  task_request: '#3b82f6',
  info_request: '#8b5cf6',
  schedule_request: '#f59e0b',
  change_request: '#ef4444',
  urgent_request: '#dc2626',
  non_request: '#6b7280',
};

const INTENT_LABELS: Record<string, string> = {
  task_request: 'Task',
  info_request: 'Info',
  schedule_request: 'Schedule',
  change_request: 'Change',
  urgent_request: 'Urgent',
  non_request: 'N/A',
};

export default function WhatsAppApprovalLane({
  requests,
  onApprove,
  onDismiss,
  loading = false,
}: WhatsAppApprovalLaneProps) {
  return (
    <div style={{
      backgroundColor: '#fef3c7',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '320px',
      maxWidth: '380px',
    }}>
      {/* Lane Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
          NEEDS REVIEW
        </h3>
        <span style={{
          backgroundColor: '#f59e0b',
          color: 'white',
          borderRadius: '12px',
          padding: '2px 10px',
          fontSize: '12px',
          fontWeight: 700,
        }}>
          {requests.length}
        </span>
      </div>

      {/* Cards */}
      {loading ? (
        <p style={{ color: '#92400e', fontSize: '13px', textAlign: 'center' }}>Loading...</p>
      ) : requests.length === 0 ? (
        <p style={{ color: '#92400e', fontSize: '13px', textAlign: 'center', opacity: 0.7 }}>
          No pending requests
        </p>
      ) : (
        requests.map((req) => (
          <ApprovalCard
            key={req.id}
            request={req}
            onApprove={onApprove}
            onDismiss={onDismiss}
          />
        ))
      )}
    </div>
  );
}

function ApprovalCard({
  request,
  onApprove,
  onDismiss,
}: {
  request: PendingRequest;
  onApprove: (id: string, lane: 'NOW' | 'NEXT' | 'LATER') => void;
  onDismiss: (id: string, reason?: string) => void;
}) {
  const [showLaneOptions, setShowLaneOptions] = useState(false);
  const intentColor = INTENT_COLORS[request.classification.intent] || '#6b7280';
  const intentLabel = INTENT_LABELS[request.classification.intent] || request.classification.intent;
  const confidencePct = Math.round(request.classification.confidence * 100);
  const timeAgo = getTimeAgo(request.timestamp);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
    }}>
      {/* Header row: sender + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>
          {request.senderName}
        </span>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{timeAgo}</span>
      </div>

      {/* Classification badge */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{
          backgroundColor: intentColor,
          color: 'white',
          borderRadius: '4px',
          padding: '1px 6px',
          fontSize: '11px',
          fontWeight: 600,
        }}>
          {intentLabel}
        </span>
        <span style={{
          backgroundColor: confidencePct >= 80 ? '#10b981' : confidencePct >= 60 ? '#f59e0b' : '#ef4444',
          color: 'white',
          borderRadius: '4px',
          padding: '1px 6px',
          fontSize: '11px',
          fontWeight: 600,
        }}>
          {confidencePct}%
        </span>
        <span style={{
          backgroundColor: '#e5e7eb',
          color: '#6b7280',
          borderRadius: '4px',
          padding: '1px 6px',
          fontSize: '11px',
        }}>
          {request.classification.method}
        </span>
      </div>

      {/* Summary */}
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0', fontStyle: 'italic' }}>
        {request.classification.summary}
      </p>

      {/* Raw message */}
      <p style={{
        fontSize: '13px',
        color: '#374151',
        margin: '0 0 10px 0',
        lineHeight: '1.4',
        maxHeight: '60px',
        overflow: 'hidden',
      }}>
        {request.rawMessage}
      </p>

      {/* Action buttons */}
      {!showLaneOptions ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowLaneOptions(true)}
            style={{
              flex: 1,
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Approve
          </button>
          <button
            onClick={() => onDismiss(request.id)}
            style={{
              flex: 1,
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px 0' }}>Move to lane:</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['NOW', 'NEXT', 'LATER'] as const).map((lane) => (
              <button
                key={lane}
                onClick={() => {
                  onApprove(request.id, lane);
                  setShowLaneOptions(false);
                }}
                style={{
                  flex: 1,
                  backgroundColor: lane === 'NOW' ? '#dc2626' : lane === 'NEXT' ? '#f59e0b' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {lane}
              </button>
            ))}
            <button
              onClick={() => setShowLaneOptions(false)}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}