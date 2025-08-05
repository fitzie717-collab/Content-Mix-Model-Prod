
import { appRoute } from '@genkit-ai/next';

// Import all flow files here to register them with Genkit
import '../../../../ai/flows/asset-analysis-flow';
import '../../../../ai/flows/brand-safety-flow';
import '../../../../ai/flows/content-attribution-flow';
import '../../../../ai/flows/creative-scorecard-flow';

// Expose the flows using the Genkit Next.js app route handler
export const { GET, POST } = appRoute();

  
  try {
    const result = await runFlow(flow, input);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || 'An error occurred' },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };