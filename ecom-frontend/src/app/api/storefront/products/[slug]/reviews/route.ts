import { apiError, json, readJson } from '@/server/http';
import { optionalCustomer } from '@/server/request-auth';
import { createReview } from '@/server/shopping';

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const customer = await optionalCustomer(req);
    const { slug } = await ctx.params;
    const result = await createReview(slug, await readJson(req), customer?.sub);
    return json(result.body, result.status);
  } catch (err) {
    return apiError(err);
  }
}
