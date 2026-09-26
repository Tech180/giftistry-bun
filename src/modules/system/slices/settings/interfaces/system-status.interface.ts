export interface SystemStatus {
  Initialized: boolean;
  AllowSetup: boolean;
  AiEnabled: boolean;
  AiWebSearchEnabled: boolean;
  MaintenanceMode: boolean;
  MaintenanceMessage: string;
  RegistrationMode: string;
  OAuthEnabled: boolean;
  AllowPasswordLogin: boolean;
  RequireStrongPasswords: boolean;
}
