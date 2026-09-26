export const SYSTEM_PUBLIC_SWAGGER_DETAIL = {
  tags: ['System'] as string[],
};

export const SYSTEM_OWNER_SWAGGER_DETAIL = {
  tags: ['System'] as string[],
  security: [{ bearerAuth: [] as string[] }],
};
