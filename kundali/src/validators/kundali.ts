import {z} from "zod";

const chartOptionsSchema=z.object({
  layout:z.enum(["north_indian"]).default("north_indian"),
  planetDisplay:z.enum(["vedic","all"]).default("vedic"),
  includeOuterPlanets:z.boolean().default(false),
  degreePrecision:z.number().int().min(0).max(4).default(2)
}).default({layout:"north_indian",planetDisplay:"vedic",includeOuterPlanets:false,degreePrecision:2});

export const kundaliRequestSchema=z.object({birth:z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),place:z.string().trim().min(2).max(200).optional(),latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional()}),include:z.object({d1:z.boolean().default(true),d9:z.boolean().default(true),vimshottari:z.boolean().default(true),panchang:z.boolean().default(false),charts:z.boolean().default(false),chartOptions:chartOptionsSchema}).default({d1:true,d9:true,vimshottari:true,panchang:false,charts:false,chartOptions:{layout:"north_indian",planetDisplay:"vedic",includeOuterPlanets:false,degreePrecision:2}})});export type ValidatedKundaliRequest=z.infer<typeof kundaliRequestSchema>;
