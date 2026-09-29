import { apiError, json, readJson } from '@/server/http';
import { checkoutQuote } from '@/server/shopping';

export async function POST(req: Request) {
  try {
    return json(await checkoutQuote(await readJson(req)));
  } catch (err) {
    return apiError(err);
  }
}
