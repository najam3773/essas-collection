import { apiError, json } from '@/server/http';
import { cartSessionHeader, optionalCustomer } from '@/server/request-auth';
import { getCart } from '@/server/shopping';

export async function GET(req: Request) {
  try {
    const customer = await optionalCustomer(req);
    return json(await getCart(cartSessionHeader(req), customer?.sub));
  } catch (err) {
    return apiError(err);
  }
}
