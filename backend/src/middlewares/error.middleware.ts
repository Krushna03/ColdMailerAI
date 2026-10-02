import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

interface FormattedZodIssue {
  label: string;
  stepIndex?: number;
  fieldName?: string;
  message: string;
  fullMessage: string;
}

function formatZodErrors(issues: any[]): { message: string; errors: string[] } {
  if (!issues || issues.length === 0) {
    return { message: "Validation error", errors: ["Validation error"] };
  }

  const parsed: FormattedZodIssue[] = issues.map((issue) => {
    const path = issue.path || [];
    let label = "";
    let stepIndex: number | undefined = undefined;
    let fieldName: string | undefined = undefined;

    if (path.length > 0) {
      if (path[0] === "steps" && typeof path[1] === "number") {
        stepIndex = path[1];
        const remaining = path.slice(2).join(".");
        const stepFieldLabels: Record<string, string> = {
          "webhookConfig.url": "Webhook URL",
          "webhookConfig.method": "Webhook Method",
          "webhookConfig.headers": "Webhook Headers",
          "template.subject": "Email Subject",
          "template.body": "Email Body",
          "template.aiPrompt": "AI Prompt",
          "taskConfig.title": "Task Title",
          "taskConfig.description": "Task Description",
          "aiActionConfig.prompt": "AI Action Prompt",
          "aiActionConfig.actionType": "AI Action Type",
          "delay.value": "Delay Duration",
          "delay.unit": "Delay Unit",
          "conditions.field": "Condition Trigger",
          "conditions.operator": "Condition Operator",
          "conditions.value": "Condition Value",
          "conditions.actionOnFalse": "Action On Condition False",
          "title": "Step Title",
          "type": "Step Type",
          "order": "Step Order",
        };

        fieldName = stepFieldLabels[remaining] || (remaining ? remaining.replace(/\./g, " > ") : "Configuration");
        label = `Step ${stepIndex + 1} (${fieldName})`;
      } else {
        const fullPath = path.join(".");
        const generalFieldLabels: Record<string, string> = {
          "name": "Sequence Name",
          "description": "Description",
          "status": "Status",
          "settings.mailboxId": "Sending Mailbox",
          "settings.sendWindow.start": "Send Window Start Time",
          "settings.sendWindow.end": "Send Window End Time",
          "settings.sendWindow.timezone": "Timezone",
          "settings.sendOnDays": "Sending Days",
          "settings.maxDailyEnrollments": "Daily Limit",
          "enrollmentRules.autoEnrollSegmentId": "Auto-enroll Segment",
          "enrollmentRules.stopIfLeadStatus": "Stop Condition Statuses",
          "leadIds": "Selected Leads",
          "segmentId": "Segment",
          "steps": "Steps",
        };

        label = generalFieldLabels[fullPath] || path
          .map((p: any) =>
            typeof p === "string"
              ? p.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
              : String(p)
          )
          .join(" > ");
      }
    }

    let msg = issue.message || "Invalid value";
    if (msg === "Invalid url" || msg === "Invalid URL" || msg === "Invalid URL.") {
      msg = "Please enter a valid URL (e.g. https://api.yourdomain.com/webhook)";
    } else if (msg.startsWith("Too big: expected string to have <=")) {
      const maxMatch = msg.match(/<=(\d+)/);
      msg = maxMatch ? `Cannot exceed ${maxMatch[1]} characters` : "Text is too long";
    } else if (msg.startsWith("Too small: expected string to have >=")) {
      msg = "This field cannot be empty";
    }

    const fullMessage = label
      ? msg.toLowerCase().includes(label.toLowerCase())
        ? msg
        : `${label}: ${msg}`
      : msg;

    return { label, stepIndex, fieldName, message: msg, fullMessage };
  });

  // Group step errors with identical field and message (e.g., Steps 1–6 (Webhook URL): ...)
  const stepErrorsByMsg: Record<string, { steps: number[]; field: string; msg: string }> = {};
  const nonGrouped: string[] = [];

  for (const item of parsed) {
    if (item.stepIndex !== undefined && item.fieldName) {
      const key = `${item.fieldName}:::${item.message}`;
      if (!stepErrorsByMsg[key]) {
        stepErrorsByMsg[key] = { steps: [], field: item.fieldName, msg: item.message };
      }
      stepErrorsByMsg[key].steps.push(item.stepIndex + 1);
    } else {
      nonGrouped.push(item.fullMessage);
    }
  }

  const formattedErrors: string[] = [...nonGrouped];

  for (const group of Object.values(stepErrorsByMsg)) {
    if (group.steps.length === 1) {
      formattedErrors.push(`Step ${group.steps[0]} (${group.field}): ${group.msg}`);
    } else if (group.steps.length > 1) {
      const sorted = group.steps.sort((a, b) => a - b);
      const isConsecutive = sorted.every((val, i) => i === 0 || val === sorted[i - 1] + 1);
      const rangeText = isConsecutive
        ? `Steps ${sorted[0]}–${sorted[sorted.length - 1]}`
        : `Steps ${sorted.join(", ")}`;
      formattedErrors.push(`${rangeText} (${group.field}): ${group.msg}`);
    }
  }

  const uniqueErrors = Array.from(new Set(formattedErrors));
  const primaryMessage = uniqueErrors.length === 1
    ? uniqueErrors[0]
    : uniqueErrors[0] || "Validation error";

  return { message: primaryMessage, errors: uniqueErrors };
}

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req?.id;

  logger.error(err.message || "Unhandled server error", {
    requestId,
    name: err.name,
    statusCode: err.statusCode || 500,
    stack: err.stack,
    path: req?.originalUrl || req?.path,
    userId: req?.user?._id ? String(req.user._id) : undefined,
    workspaceId: req?.workspaceId ? String(req.workspaceId) : undefined
  });

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId,
      errors: err.errors || []
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError' || Array.isArray(err.issues)) {
    const issues = err.issues || [];
    const { message, errors } = formatZodErrors(issues);

    return res.status(400).json({
      success: false,
      message,
      requestId,
      errors
    });
  }

  // Handle validation errors (e.g., from mongoose)
  if (err.name === 'ValidationError') {
    const errorList = Object.values(err.errors || {}).map((e: any) => e.message);
    return res.status(400).json({
      success: false,
      message: errorList[0] || 'Validation Error',
      requestId,
      errors: errorList
    });
  }

  // Handle cast errors (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      requestId
    });
  }

  // Default error handler
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === "production" && statusCode === 500
    ? "Something went wrong"
    : (err.message || "Internal Server Error");

  res.status(statusCode).json({
    success: false,
    message,
    requestId
  });
};
