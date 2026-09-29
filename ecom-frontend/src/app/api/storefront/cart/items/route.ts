import { apiError, json, readJson } from '@/server/http';
import { cartSessionHeader } from '@/server/request-auth';
import { addCartItem } from '@/server/shopping';

export async function POST(req: Request) {
  try {
    return json(await addCartItem(await readJson(req), cartSessionHeader(req)));
  } catch (err) {
    return apiError(err);
  }
}
