import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const skip = new Set(['middleware.ts']);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(p);
  }
  return acc;
}

const files = walk(root);
let changed = 0;
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  const orig = text;
  text = text.replaceAll('tenant_token', 'staff_token');
  text = text.replaceAll('tenant_bootstrap', 'staff_bootstrap');
  text = text.replaceAll('platform_token', 'staff_token');
  text = text.replace(/,\s*tenantSlug:\s*tenant/g, '');
  text = text.replace(/tenantSlug:\s*tenant,\s*/g, '');
  text = text.replace(/tenantSlug:\s*tenant/g, '');
  text = text.replace(/`\/store\/\$\{tenant\}\/product\/\$\{([^}]+)\}`/g, '`/product/${$1}`');
  text = text.replace(/`\/store\/\$\{tenant\}\/collections\/\$\{([^}]+)\}`/g, '`/collections/${$1}`');
  text = text.replace(/`\/store\/\$\{tenant\}\/pages\/\$\{([^}]+)\}`/g, '`/pages/${$1}`');
  text = text.replace(/`\/store\/\$\{tenant\}\/shop\?q=\$\{([^}]+)\}`/g, '`/shop?q=${$1}`');
  text = text.replaceAll('`/store/${tenant}/shop`', "'/shop'");
  text = text.replaceAll('`/store/${tenant}/cart`', "'/cart'");
  text = text.replaceAll('`/store/${tenant}/account`', "'/account'");
  text = text.replaceAll('`/store/${tenant}/login`', "'/login'");
  text = text.replaceAll('`/store/${tenant}/wishlist`', "'/wishlist'");
  text = text.replaceAll('`/store/${tenant}/compare`', "'/compare'");
  text = text.replaceAll('`/store/${tenant}`', "'/'");
  text = text.replaceAll('href={`/store/${tenant}`}', 'href="/"');
  text = text.replace(/href=\{`\/store\/\$\{tenant\}\/([^`]+)`\}/g, 'href={`/$1`}');
  if (text !== orig) {
    fs.writeFileSync(file, text);
    changed += 1;
    console.log('updated', path.relative(root, file));
  }
}
console.log('files changed', changed);
