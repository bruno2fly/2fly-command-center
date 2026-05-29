-- ============================================================
-- 2FLY MARKETING COMMAND CENTER — Database Schema
-- ============================================================
-- Run this in Supabase SQL Editor to create all tables
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Team Members
CREATE TABLE "TeamMember" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "avatarUrl" TEXT,
    "weeklyCapacity" INTEGER NOT NULL DEFAULT 2400,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients
CREATE TABLE "Client" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "platforms" TEXT NOT NULL,
    "monthlyRetainer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roasTarget" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "healthStatus" TEXT NOT NULL DEFAULT 'green',
    "workspace" TEXT NOT NULL DEFAULT 'agency',
    "notes" TEXT,
    "flowClientId" TEXT,
    "billingDay" INTEGER NOT NULL DEFAULT 1,
    "autoInvoice" BOOLEAN NOT NULL DEFAULT true,
    "invoiceEmail" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content Strategy
CREATE TABLE "ContentStrategy" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Client Strategy
CREATE TABLE "ClientStrategy" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "summary" TEXT,
    "diagnosis" TEXT,
    "goals" TEXT,
    "actions" TEXT,
    "campaigns" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Daily Reports
CREATE TABLE "DailyReport" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weekStart" TEXT,
    "weekEnd" TEXT,
    "contentCreated" INTEGER NOT NULL DEFAULT 0,
    "contentPublished" INTEGER NOT NULL DEFAULT 0,
    "tasksStarted" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "requestsHandled" INTEGER NOT NULL DEFAULT 0,
    "agentActionsProposed" INTEGER NOT NULL DEFAULT 0,
    "agentActionsExecuted" INTEGER NOT NULL DEFAULT 0,
    "adSpend" DOUBLE PRECISION,
    "adLeads" INTEGER,
    "adCPL" DOUBLE PRECISION,
    "adCTR" DOUBLE PRECISION,
    "adImpressions" INTEGER,
    "adClicks" INTEGER,
    "summary" TEXT NOT NULL,
    "highlights" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE("clientId", "date", "type")
);

-- Meta Connection
CREATE TABLE "MetaConnection" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT UNIQUE NOT NULL,
    "metaUserId" TEXT,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMPTZ,
    "adAccountId" TEXT,
    "adAccountName" TEXT,
    "pageId" TEXT,
    "pageName" TEXT,
    "igAccountId" TEXT,
    "scopes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Google Ads Connection
CREATE TABLE "GoogleAdsConnection" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT UNIQUE NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT,
    "managerAccountId" TEXT,
    "refreshToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Google Connection
CREATE TABLE "GoogleConnection" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT UNIQUE NOT NULL,
    "googleAccountId" TEXT,
    "accountEmail" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMPTZ,
    "locationId" TEXT,
    "locationName" TEXT,
    "placeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Health Log
CREATE TABLE "HealthLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "healthStatus" TEXT NOT NULL,
    "bufferDays" INTEGER NOT NULL,
    "openRequests" INTEGER NOT NULL,
    "weeklyRoas" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Content Items
CREATE TABLE "ContentItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "notes" TEXT,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledDate" TIMESTAMPTZ,
    "publishedDate" TIMESTAMPTZ,
    "assignedTo" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "directiveId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Directives
CREATE TABLE "Directive" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "message" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "tasksCreated" INTEGER NOT NULL DEFAULT 0,
    "contentCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "completedAt" TIMESTAMPTZ
);

-- Agent Actions
CREATE TABLE "AgentAction" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT,
    "clientName" TEXT,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "proposedAction" TEXT NOT NULL,
    "executionPlan" TEXT,
    "executionType" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "result" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "approvedAt" TIMESTAMPTZ,
    "executedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ
);

-- Tasks
CREATE TABLE "Task" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'task',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignedTo" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "directiveId" TEXT,
    "weekLabel" TEXT,
    "canAgentExecute" BOOLEAN NOT NULL DEFAULT false,
    "agentInstructions" TEXT,
    "dueDate" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Client Requests
CREATE TABLE "ClientRequest" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assignedTo" TEXT,
    "dueDate" TIMESTAMPTZ,
    "resolvedAt" TIMESTAMPTZ,
    "slaBreach" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Ad Reports
CREATE TABLE "AdReport" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "weekStart" TIMESTAMPTZ NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topCampaign" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Invoices
CREATE TABLE "Invoice" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issuedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "dueDate" TIMESTAMPTZ NOT NULL,
    "paidDate" TIMESTAMPTZ,
    "paidAmount" DOUBLE PRECISION,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'retainer',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Ad Campaigns
CREATE TABLE "AdCampaign" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "metaCampaignId" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dailyBudget" DOUBLE PRECISION,
    "lifetimeBudget" DOUBLE PRECISION,
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "strategy" TEXT,
    "audienceSpec" TEXT,
    "adCopy" TEXT,
    "expectedCpa" DOUBLE PRECISION,
    "expectedRoas" DOUBLE PRECISION,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'meta-traffic',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Ad Sets
CREATE TABLE "AdSet" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targeting" TEXT,
    "placements" TEXT,
    "dailyBudget" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Ads
CREATE TABLE "Ad" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "adSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryText" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "description" TEXT,
    "callToAction" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "landingPageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("adSetId") REFERENCES "AdSet"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Briefs
CREATE TABLE "Brief" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "highlights" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "healthSnapshot" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "readAt" TIMESTAMPTZ
);

-- WhatsApp Conversations
CREATE TABLE "WhatsappConversation" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "contactNumber" TEXT NOT NULL,
    "contactName" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMPTZ,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WhatsApp Messages
CREATE TABLE "WhatsappMessage" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "conversationId" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "twilioSid" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("conversationId") REFERENCES "WhatsappConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Ad Action Log
CREATE TABLE "AdActionLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionDetail" TEXT NOT NULL,
    "campaignId" TEXT,
    "metricsBefore" TEXT,
    "metricsAfter3d" TEXT,
    "metricsAfter7d" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "checkedAt3d" TIMESTAMPTZ,
    "checkedAt7d" TIMESTAMPTZ
);

-- Agent Chat
CREATE TABLE "AgentChat" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "tab" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AI Updates
CREATE TABLE "AiUpdate" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "impact" TEXT,
    "action" TEXT,
    "source" TEXT,
    "category" TEXT NOT NULL DEFAULT 'update',
    "relevance" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'inbox',
    "deepResearch" TEXT,
    "deepStatus" TEXT NOT NULL DEFAULT 'none',
    "strategyPlan" TEXT,
    "strategyStatus" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client Media
CREATE TABLE "ClientMedia" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "tags" TEXT,
    "notes" TEXT,
    "category" TEXT NOT NULL DEFAULT 'photo',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Website Config
CREATE TABLE "WebsiteConfig" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT UNIQUE NOT NULL,
    "url" TEXT NOT NULL,
    "gitRepo" TEXT,
    "gitBranch" TEXT NOT NULL DEFAULT 'main',
    "hostingPlatform" TEXT,
    "analyticsId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastCheckedAt" TIMESTAMPTZ,
    "uptimePercent" DOUBLE PRECISION,
    "pagespeedScore" INTEGER,
    "seoScore" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX "ContentStrategy_clientId_type_idx" ON "ContentStrategy"("clientId", "type");
CREATE INDEX "AgentChat_clientId_tab_idx" ON "AgentChat"("clientId", "tab");
CREATE INDEX "ClientMedia_clientId_idx" ON "ClientMedia"("clientId");