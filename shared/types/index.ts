export * from './database.types';
export * from './bonfire';
import type { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
