import { apiError, json } from '@/server/http';
import { recoverCart } from '@/server/shopping';

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    return json(await recoverCart(token));
  } catch (err) {
    return apiError(err);
  }
}
