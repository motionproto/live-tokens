import '../../../src/system/styles/tokens.css';
import '../../../src/live-tokens/data/tokens.generated.css';
import '../../../src/system/styles/fonts.css';

import { bootLiveTokens } from '../../../src/editor/bootstrap';
import States from './States.svelte';

bootLiveTokens(States, '#app');
