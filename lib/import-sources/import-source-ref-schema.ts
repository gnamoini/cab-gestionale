import { z } from "zod";

export const importSourceRefSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("import_file"), id: z.string().uuid() }),
  z.object({ type: z.literal("legacy_document"), id: z.string().uuid() }),
]);
