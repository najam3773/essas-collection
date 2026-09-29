import { apiError, json } from '@/server/http';
import { fulfillmentOptions } from '@/server/shopping';

export async function GET() {
  try {
    return json(await fulfillmentOptions());
  } catch (err) {
    return apiError(err);
  }
}
