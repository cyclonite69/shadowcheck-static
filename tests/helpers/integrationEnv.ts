export const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

export const describeIfIntegration = runIntegration ? describe : describe.skip;
export const testIfIntegration = runIntegration ? test : test.skip;
export const itIfIntegration = runIntegration ? it : it.skip;
