import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
app.listen(config.port, config.listenHost, () => {
  console.log(`Commerce API listening on http://${config.listenHost}:${config.port}`);
});
