const runIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' || process.env.RUN_INTEGRATION_TESTS === '1';

const describeIfIntegration = runIntegration ? describe : describe.skip;
const testIfIntegration = runIntegration ? test : test.skip;
const itIfIntegration = runIntegration ? it : it.skip;

module.exports = {
  runIntegration,
  describeIfIntegration,
  testIfIntegration,
  itIfIntegration,
};
