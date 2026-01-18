import { createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'manager' | 'technician';

export interface AppUser extends User {
  role?: UserRole;
  organizationId?: string;
  technicianId?: string;
}

export interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, organizationId: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRole: UserRole) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
