import { apiError, json } from '@/server/http';
import { cartSessionHeader } from '@/server/request-auth';
import { cartUpsells } from '@/server/shopping';

export async function GET(req: Request) {
  try {
    return json(await cartUpsells(cartSessionHeader(req)));
  } catch (err) {
    return apiError(err);
  }
}
