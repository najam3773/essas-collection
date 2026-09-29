import { apiError, json, readJson } from '@/server/http';
import { updateCartItem } from '@/server/shopping';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return json(await updateCartItem(id, await readJson(req)));
  } catch (err) {
    return apiError(err);
  }
}
