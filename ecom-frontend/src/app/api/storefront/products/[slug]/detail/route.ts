import { apiError, json } from '@/server/http';
import { productDetail } from '@/server/storefront';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    return json(await productDetail(slug));
  } catch (err) {
    return apiError(err);
  }
}
