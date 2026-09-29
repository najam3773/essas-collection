import { apiError, json } from '@/server/http';
import { searchSuggest } from '@/server/shopping';

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get('q') || '';
    return json(await searchSuggest(q));
  } catch (err) {
    return apiError(err);
  }
}
