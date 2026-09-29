import { apiError, empty, json } from '@/server/http';
import { requireCustomer } from '@/server/request-auth';
import { addWishlistItem, removeWishlistItem } from '@/server/shopping';

export async function POST(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  try {
    const customer = await requireCustomer(req);
    const { productId } = await ctx.params;
    return json(await addWishlistItem(customer.sub, productId));
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  try {
    const customer = await requireCustomer(req);
    const { productId } = await ctx.params;
    await removeWishlistItem(customer.sub, productId);
    return empty();
  } catch (err) {
    return apiError(err);
  }
}
