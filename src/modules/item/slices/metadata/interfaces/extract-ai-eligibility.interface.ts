import type { ResolvedAiConnection } from '@/common/utils/interfaces/resolved-ai-connection.interface';

export interface ExtractAiEligibility {
  aiAllowed: boolean;
  serverAiReady: boolean;
  fastConnection: ResolvedAiConnection;
}
