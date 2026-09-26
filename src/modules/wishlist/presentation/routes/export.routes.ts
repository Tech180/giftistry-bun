import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { UseCases } from '../interfaces/use-cases.interface';

export const exportRoutes = (useCases: UseCases, middleware: RouteMiddleware) =>
  new Elysia()
    .use(middleware.auth)
    .use(middleware.listAccess)
    .get(
      '/wishlists/:listId/pdf',
      async ({ params: { listId }, getAuthUser, checkListAccess }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        const pdfBytes = await useCases.exportWishlistPdf.execute(listId, user.userId);
        return new Response(Buffer.from(pdfBytes), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="wishlist-${listId}.pdf"`,
          },
        });
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Export wishlist as PDF',
          description:
            'Generates and downloads a beautifully formatted PDF of the wishlist and its items.',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .get(
      '/wishlists/:listId/export',
      async ({ params: { listId }, query: { format }, getAuthUser, checkListAccess }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        const result = await useCases.exportWishlistData.execute(
          listId,
          user.userId,
          format as 'csv' | 'xlsx' | 'txt' | 'json'
        );
        const body = typeof result.data === 'string' ? result.data : Buffer.from(result.data);
        return new Response(body, {
          headers: {
            'Content-Type': result.contentType,
            'Content-Disposition': `attachment; filename="${result.filename}"`,
          },
        });
      },
      {
        query: t.Object({
          format: t.Union([
            t.Literal('csv'),
            t.Literal('xlsx'),
            t.Literal('txt'),
            t.Literal('json'),
          ]),
        }),
        detail: {
          tags: ['Wishlists'],
          summary: 'Export wishlist data',
          description: 'Generates and downloads a wishlist in CSV, XLSX, TXT, or JSON formats.',
          security: [{ bearerAuth: [] }],
        },
      }
    );
