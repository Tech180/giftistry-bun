import type { createInfrastructureAdapters } from '@/boot/wire-adapters';

export type InfrastructureAdapters = ReturnType<typeof createInfrastructureAdapters>;
