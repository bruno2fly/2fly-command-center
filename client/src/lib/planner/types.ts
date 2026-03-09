export type TaskBucket = "now" | "next" | "later" | "inbox";
export type TaskType = "deep" | "admin" | "call" | "creative";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done";
export type TaskSource = "whatsapp" | "discord" | "email" | "manual";
export type TaskTag = "Urgent" | "Waiting" | "Admin" | "Creative";
export type WorkMode = "deep" | "admin" | "calls";

export type Task = {
  id: string;
  title: string;
  client: string;
  bucket: TaskBucket;
  durationMin: number;
  dueAt?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  type: TaskType;
  status: TaskStatus;
  tags: TaskTag[];
  blockers: string[];
  source: TaskSource;
  whyNow?: string;
};

export type TimeBlock = {
  id: string;
  label: string;
  minutes: number;
  assignedTaskIds: string[];
};
