import type { Document } from '../interfaces/document.interface.js';

export function selectPendingSalesOrders(
  documents: Document[],
): Document[] {
  return documents.filter(
    (document) =>
      document.type === 'OV' &&
      document.status === 'pending',
  );
}