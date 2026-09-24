import { z } from "zod";

const positionSchema = z.object({
  longitude: z.number().finite(),
  sign: z.object({
    id: z.number().int(),
    name: z.string(),
    lord: z.string()
  }),
  degree: z.number().int().min(0).max(29),
  minutes: z.number().int().min(0).max(59),
  seconds: z.number().min(0).max(60),
  retrograde: z.boolean()
});

const nakshatraSchema = z.object({
  number: z.number().int().min(1).max(27),
  name: z.string(),
  pada: z.number().int().min(1).max(4),
  lord: z.string()
});

const planetSchema = z.object({
  name: z.string(),
  position: positionSchema,
  house: z.number().int().min(1).max(12),
  nakshatra: nakshatraSchema
});

const d1Schema = z.object({
  ascendant: z.object({
    position: positionSchema,
    house: z.number().int().min(1).max(12),
    nakshatra: nakshatraSchema
  }),
  planets: z.record(z.string(), planetSchema),
  referenceSign: z.string(),
  julianDayUt: z.number().finite(),
  utcDatetime: z.string()
});

const panchangSchema = z.object({
  vaara: z.string(),
  nakshatra: z.array(z.object({
    id: z.number(),
    name: z.string(),
    lord: z.object({ name: z.string() }),
    start: z.string(),
    end: z.string()
  })),
  tithi: z.array(z.object({
    id: z.number(),
    index: z.number(),
    name: z.string(),
    paksha: z.string(),
    start: z.string(),
    end: z.string()
  })),
  karana: z.array(z.object({
    id: z.number(),
    index: z.number(),
    name: z.string(),
    start: z.string(),
    end: z.string()
  })),
  yoga: z.array(z.object({
    id: z.number(),
    name: z.string(),
    start: z.string(),
    end: z.string()
  })),
  sunrise: z.string(),
  sunset: z.string(),
  moonrise: z.string(),
  moonset: z.string()
});

const moonChartSchema = z.object({
  referenceSign: z.string(),
  referenceSignId: z.number().int().min(1).max(12),
  planets: z.record(z.string(), z.object({
    name: z.string(), longitude: z.number().finite(), sign: z.string(),
    signId: z.number().int().min(1).max(12), house: z.number().int().min(1).max(12)
  }))
});

const chartImageSchema = z.object({
  format: z.literal("png"),
  encoding: z.literal("base64"),
  mimeType: z.literal("image/png"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  data: z.string().min(1)
});

const renderedChartsSchema = z.object({
  lagna: chartImageSchema.optional(),
  navamsa: chartImageSchema.optional(),
  moon: chartImageSchema.optional()
});

const d9Schema = z.object({
  referenceSign: z.string(),
  placements: z.record(
    z.string(),
    z.object({
      longitude: z.number().finite(),
      sign: z.string(),
      house: z.number().int().min(1).max(12)
    })
  )
});

const vimshottariSchema = z.object({
  yearMode: z.string(),
  balance: z.object({
    lord: z.string(),
    elapsedFraction: z.number().finite(),
    remainingFraction: z.number().finite(),
    balanceYears: z.number().finite()
  }),
  mahadashas: z.array(
    z.object({
      lord: z.string(),
      start: z.string(),
      end: z.string(),
      durationDays: z.number().finite()
    })
  )
});

export const kundaliResponseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  provider: z.object({
    name: z.literal("navamsha"),
    calculation: z.object({
      ayanamsha: z.string(),
      observationPoint: z.string()
    })
  }),
  birth: z.object({
    date: z.string(),
    time: z.string(),
    place: z.object({
      input: z.string(),
      displayName: z.string(),
      latitude: z.number().finite(),
      longitude: z.number().finite(),
      timezone: z.string(),
      utcOffsetMinutes: z.number().finite()
    })
  }),
  charts: z.object({
    d1: d1Schema.optional(),
    d9: d9Schema.optional(),
    moon: moonChartSchema.optional(),
    images: renderedChartsSchema.optional()
  }),
  panchang: panchangSchema.optional(),
  dashas: z.object({
    vimshottari: vimshottariSchema
  }).optional()
});

export type FrozenKundaliResponse = z.infer<typeof kundaliResponseSchema>;
