export interface Document {
  id: number;
  number: string;
  type: 'OV' | 'OC' | 'PR' | 'RE' | 'NC';
  userId: number;
  clientId: number;
  amount: string;
  isExport: boolean;
  status: 'pending' | 'invoiced' | 'cancelled';
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}