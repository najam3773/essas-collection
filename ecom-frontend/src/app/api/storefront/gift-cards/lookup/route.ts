import { apiError, json, readJson } from '@/server/http';
import { lookupGiftCard } from '@/server/shopping';

export async function POST(req: Request) {
  try {
    return json(await lookupGiftCard(await readJson(req)));
  } catch (err) {
    return apiError(err);
  }
}
