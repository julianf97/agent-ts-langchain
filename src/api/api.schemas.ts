import { z } from 'zod';

export const documentSchema = z.object({
  id: z.number().int().positive(),
  type: z.string(),
  status: z.string(),
});

export const documentListSchema = z.object({
  documents: z.array(documentSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const loginSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().positive(),
});

export const invoiceSchema = z.object({
  id: z.number().int().positive(),
  number: z.string(),
  documentId: z.number().int().positive(),
  type: z.enum(['A', 'B', 'E']),
  status: z.string(),
});

export type Document = z.infer<typeof documentSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
