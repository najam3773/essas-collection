import { apiError, json } from '@/server/http';
import { pageBySlug } from '@/server/shopping';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    return json(await pageBySlug(slug));
  } catch (err) {
    return apiError(err);
  }
}
