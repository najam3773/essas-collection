import { apiError, json } from '@/server/http';
import { productBySlug } from '@/server/storefront';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    return json(await productBySlug(slug));
  } catch (err) {
    return apiError(err);
  }
}
