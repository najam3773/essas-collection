import { apiError, json } from '@/server/http';
import { requireCustomer } from '@/server/request-auth';
import { getWishlist } from '@/server/shopping';

export async function GET(req: Request) {
  try {
    const customer = await requireCustomer(req);
    return json(await getWishlist(customer.sub));
  } catch (err) {
    return apiError(err);
  }
}
