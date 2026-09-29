import { apiError, json, readJson } from '@/server/http';
import { requireCustomer } from '@/server/request-auth';
import { getAccount, updateAccount } from '@/server/shopping';

export async function GET(req: Request) {
  try {
    const customer = await requireCustomer(req);
    return json(await getAccount(customer.sub));
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const customer = await requireCustomer(req);
    return json(await updateAccount(customer.sub, await readJson(req)));
  } catch (err) {
    return apiError(err);
  }
}
