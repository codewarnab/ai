/**
 * Reproduction for issue #5414: Observation mismatch when running parallel LLM calls
 *
 * Issue: When running multiple LLMs in parallel, the observation traces are
 * incorrectly mapped. All traces preserve the name and timing from the first
 * call instead of matching each call's unique context.
 *
 * Expected: Each parallel LLM call should have its own separate trace with
 * distinct names and timings.
 *
 * Actual: All observation traces get overwritten with the first trace's
 * metadata (name and timing), resulting in mismatched logs.
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import 'dotenv/config';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Simulated trace ID (would come from langfuse or similar in real usage)
const langfuseTraceId = 'trace-123';

async function main() {
  console.log('Starting parallel LLM calls with different telemetry metadata...\n');

  const model = openai('gpt-4o-mini');

  // Run three parallel calls with DIFFERENT names in telemetry
  const results = await Promise.all([
    generateText({
      model,
      prompt: 'Say the word "fruit" and nothing else',
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'fruit-generation',
        metadata: {
          langfuseTraceId,
          langfuseUpdateParent: false,
        },
      },
    }),
    generateText({
      model,
      prompt: 'Say the word "color" and nothing else',
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'color-generation',
        metadata: {
          langfuseTraceId,
          langfuseUpdateParent: false,
        },
      },
    }),
    generateText({
      model,
      prompt: 'Say the word "animal" and nothing else',
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'animal-generation',
        metadata: {
          langfuseTraceId,
          langfuseUpdateParent: false,
        },
      },
    }),
  ]);

  console.log('\n--- Results ---');
  console.log('Fruit result:', results[0].text);
  console.log('Color result:', results[1].text);
  console.log('Animal result:', results[2].text);

  console.log('\n--- Check the trace logs above ---');
  console.log('Expected: Three separate traces with functionIds:');
  console.log('  - fruit-generation');
  console.log('  - color-generation');
  console.log('  - animal-generation');
  console.log('\nActual: Check if all traces incorrectly use the same functionId');

  await sdk.shutdown();
}

main().catch(console.error);

