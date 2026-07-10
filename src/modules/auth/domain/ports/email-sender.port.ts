export interface EmailSender {
  sendVerificationEmail(email: string, username: string, token: string): Promise<void>;
}
