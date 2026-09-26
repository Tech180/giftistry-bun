import type { TourState } from '../../../domain/interfaces/tour-state.interface';

export interface CurrentUser {
  userId: string;
  email: string | null;
  Id: string;
  Username: string;
  Email: string | null;
  FirstName: string;
  LastName: string;
  CreatedAt?: Date;
  Bio?: string;
  Theme?: string;
  Avatar?: string | null;
  EmailVerified?: boolean;
  TwoFactorEnabled?: boolean;
  IsAdmin?: boolean;
  IsOwner?: boolean;
  IsDisabled?: boolean;
  ForcePasswordChange?: boolean;
  Policy?: unknown;
  AiEnabled?: boolean;
  WebSearchEnabled?: boolean;
  IsOnboarded?: boolean;
  Tour?: TourState;
}
