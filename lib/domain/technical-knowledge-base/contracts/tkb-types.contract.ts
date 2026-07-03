import { z } from "zod";

export const catalogActivitySchema = z.object({
  activityId: z.string().regex(/^[a-z0-9_]{4,80}$/),
  text: z.string().min(1),
  sort: z.number().int(),
  required: z.boolean(),
  includeInStandard: z.boolean().optional(),
  activityType: z.enum([
    "smontaggio",
    "sostituzione",
    "pulizia",
    "controllo",
    "collaudo",
    "diagnosi",
    "ripristino",
  ]),
  componenteSlugs: z.array(z.string()).optional(),
});

export const tkbPublishedSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  kbVersion: z.number().int().positive(),
  publishedAt: z.string(),
  componenti: z.array(
    z.object({
      slug: z.string(),
      label: z.string(),
      categoriaSlug: z.string().optional(),
      synonyms: z.array(z.string()).optional(),
    }),
  ),
  sintomi: z.array(
    z.object({
      slug: z.string(),
      label: z.string(),
      keywords: z.array(z.string()),
      relatedComponentiSlugs: z.array(z.string()).optional(),
    }),
  ),
  categorie: z.array(
    z.object({
      slug: z.string(),
      label: z.string(),
      sortOrder: z.number().optional(),
    }),
  ),
  procedure: z.array(z.any()),
  interventi: z.array(z.any()),
  ricambiMap: z.array(z.any()),
  searchIndex: z
    .object({
      keywordToInterventi: z.record(z.string(), z.array(z.string())),
      componentToInterventi: z.record(z.string(), z.array(z.string())),
      synonymToComponentSlug: z.record(z.string(), z.string()),
      activityById: z.record(z.string(), z.any()),
    })
    .optional(),
});

export type TkbPublishedSnapshotContract = z.infer<typeof tkbPublishedSnapshotSchema>;

export function parseTkbPublishedSnapshot(data: unknown): TkbPublishedSnapshotContract {
  return tkbPublishedSnapshotSchema.parse(data);
}
