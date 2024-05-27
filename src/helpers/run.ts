import { intro, outro, spinner } from '@clack/prompts';
import { generate } from './generate';
import { test } from './test';
import { writeFile } from 'fs/promises';
import { green, yellow } from 'kolorist';

type Options = {
  outputFile: string;
  promptFile: string;
  testCommand: string;
  testFile: string;
  lastRunError: string;
  priorCode?: string;
};

export async function runOne(options: Options) {
  const s = spinner();
  s.start('Generating code...');

  // TODO: parse any imports in the prompt file and include them in the prompt as context
  const result = await generate(options);

  await writeFile(options.outputFile, result);
  s.stop('Updated code');

  s.start('Running tests...');
  console.log('\n\n\n');
  const testResult = await test(options.testCommand);

  if (testResult.type === 'fail') {
    console.log('\n\n\n');
  }

  return {
    code: result,
    testResult,
  };
}

export type RunOptions = Options & {
  maxRuns?: number;
};

export async function* run(options: RunOptions) {
  let passed = false;
  const maxRuns = options.maxRuns ?? 10;
  for (let i = 0; i < maxRuns; i++) {
    const result = await runOne(options);
    yield result;

    if (result.testResult.type === 'success') {
      outro(green('All tests passed!'));
      passed = true;
      break;
    }
    options.lastRunError = result.testResult.message;
  }
  if (!passed) {
    outro(yellow('Max runs reached, stopping.'));
  }
}

export async function runAll(options: RunOptions) {
  intro('Running agent...');
  const results = [];
  for await (const result of run(options)) {
    results.push(result);
  }
  return results;
}
