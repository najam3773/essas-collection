import { apiError, json } from '@/server/http';
import { listPages } from '@/server/shopping';

export async function GET() {
  try {
    return json(await listPages());
  } catch (err) {
    return apiError(err);
  }
}
