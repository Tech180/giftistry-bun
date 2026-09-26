import type { UseCases } from '../interfaces/use-cases.interface';

export async function withPasskeyFlag<T extends { Id: string }>(
  useCases: UseCases,
  user: T
): Promise<T & { HasPasskey: boolean }> {
  const passkeys = await useCases.listPasskeys.execute(user.Id);
  return { ...user, HasPasskey: passkeys.length > 0 };
}
