
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { GENKIT_API_DEFAULT_OPTIONS, run } from '@genkit-ai/next';

import '../../../../ai/flows/asset-analysis-flow';
import '../../../../ai/flows/brand-safety-flow';
import '../../../../ai/flows/content-attribution-flow';
import '../../../../ai/flows/creative-scorecard-flow';

genkit({
  plugins: [googleAI()],
  ...GENKIT_API_DEFAULT_OPTIONS,
});

export { run as GET, run as POST };
