import { mergeConfig } from 'vite';
import site from '../../../vite.config';

export default mergeConfig(site, {
  build: { rolldownOptions: { input: 'tests/e2e/production-css/states.html' } },
});
