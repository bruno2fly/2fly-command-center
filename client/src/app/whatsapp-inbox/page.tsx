"use client";

/**
 * WhatsApp intake pipeline dashboard.
 * Shows the "Needs Review" approval lane alongside the task Kanban.
 */

import { useState, useEffect, useCallback } from "react";
import WhatsAppApprovalLane from "@/components/WhatsAppApprovalLane";

const API_BASE = '/api/whatsapp';

interface Task {
  id: string;
  title: string;
  description: string;
  requester: string;
  lane: 'NOW' | 'NEXT' | 'LATER' | 'DONE';
  createdAt: number;
  dueDate: number;
}

export default function WhatsAppInbox() {
  const [requests, setRequests] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, taskRes, notifRes] = await Promise.all([
        fetch(`${API_BASE}/requests?status=pending`),
        fetch(`${API_BASE}/tasks`),
        fetch(`${API_BASE}/notifications?unread=true`),
      ]);
      const reqData = await reqRes.json();
      const taskData = await taskRes.json();
      const notifData = await notifRes.json();
      setRequests(reqData.requests || []);
      setTasks(taskData.tasks || []);
      setUnreadCount(notifData.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (id: string, lane: 'NOW' | 'NEXT' | 'LATER') => {
    try {
      await fetch(`${API_BASE}/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', lane }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleDismiss = async (id: string, reason?: string) => {
    try {
      await fetch(`${API_BASE}/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', reason }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to dismiss:', err);
    }
  };

  const tasksByLane = {
    NOW: tasks.filter((t) => t.lane === 'NOW'),
    NEXT: tasks.filter((t) => t.lane === 'NEXT'),
    LATER: tasks.filter((t) => t.lane === 'LATER'),
    DONE: tasks.filter((t) => t.lane === 'DONE'),
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>WhatsApp Inbox</h1>
        {unreadCount > 0 && (
          <span style={{
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '12px',
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: 700,
          }}>
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {/* Needs Review Lane (WhatsApp requests) */}
        <WhatsAppApprovalLane
          requests={requests}
          onApprove={handleApprove}
          onDismiss={handleDismiss}
          loading={loading}
        />

        {/* Task Lanes */}
        {(['NOW', 'NEXT', 'LATER', 'DONE'] as const).map((lane) => (
          <div key={lane} style={{
            backgroundColor: lane === 'NOW' ? '#fee2e2' : lane === 'NEXT' ? '#fef3c7' : lane === 'LATER' ? '#dbeafe' : '#d1fae5',
            borderRadius: '12px',
            padding: '16px',
            minWidth: '280px',
            maxWidth: '320px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>{lane}</h3>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{tasksByLane[lane].length}</span>
            </div>
            {tasksByLane[lane].length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>No tasks</p>
            ) : (
              tasksByLane[lane].map((task) => (
                <div key={task.id} style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '13px' }}>{task.title}</p>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6b7280' }}>From: {task.requester}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}