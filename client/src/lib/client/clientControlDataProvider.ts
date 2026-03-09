/**
 * Client Control Room – data provider.
 * Swap this implementation when integrating WhatsApp, 2FlyFlow, or APIs.
 */

import {
  getInboxItems,
  getClientHealth,
  getControlItems,
  getNotes,
  getIdeas,
  getInsights,
  getClientControlMeta,
} from "./mockClientControlData";

export const clientControlDataProvider = {
  getInboxItems,
  getClientHealth,
  getControlItems,
  getNotes,
  getIdeas,
  getInsights,
  getClientControlMeta,
};
