import { apiError, json, readJson } from '@/server/http';
import { stockNotify } from '@/server/shopping';

export async function POST(req: Request) {
  try {
    return json(await stockNotify(await readJson(req)));
  } catch (err) {
    return apiError(err);
  }
}
