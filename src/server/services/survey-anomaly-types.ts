import { z } from "zod";
import { pageInput } from "./access";
import { anomalyDecisions, anomalyStatuses } from "../survey-anomaly-contract";
export const anomalySettingsValueSchema = z
  .object({
    minResponses: z.number().int().min(10).max(100000).default(10),
    uniformRate: z.number().min(0.01).max(1).multipleOf(0.0001).default(0.7),
    scoreDelta: z.number().min(0.0001).max(5).multipleOf(0.0001).default(1.5),
    revision: z.number().int().min(1).default(1),
  })
  .strict();
export const anomalySettingsSchema = anomalySettingsValueSchema
  .extend({ requestId: z.uuid() })
  .strict();
export const anomalyQuerySchema = pageInput
  .extend({
    campaignId: z.uuid().optional(),
    status: z.enum(anomalyStatuses).optional(),
  })
  .strict();
export const anomalyReviewSchema = z
  .object({
    revision: z.number().int().min(1),
    requestId: z.uuid(),
    decision: z.enum(anomalyDecisions),
    note: z.string().trim().min(10).max(5000),
  })
  .strict();
export const anomalyMetricsSchema = z
  .object({
    version: z.literal(1),
    responseCount: z.number().int().min(10),
    participationRate: z.number().min(0).max(1),
    uniformCount: z.number().int().min(0),
    uniformRate: z.number().min(0).max(1).nullable(),
    scoreDeltaAbs: z.number().min(0).max(5).nullable(),
    priorSemesterName: z.string().max(160).nullable(),
    thresholds: z
      .object({
        minResponses: z.number().int().min(10),
        uniformRate: z.number().min(0).max(1),
        scoreDelta: z.number().min(0).max(5),
      })
      .strict(),
  })
  .strict();
