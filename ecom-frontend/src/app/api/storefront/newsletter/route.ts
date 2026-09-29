import { apiError, json, readJson } from '@/server/http';
import { subscribeNewsletter } from '@/server/shopping';

export async function POST(req: Request) {
  try {
    return json(await subscribeNewsletter(await readJson(req)));
  } catch (err) {
    return apiError(err);
  }
}
