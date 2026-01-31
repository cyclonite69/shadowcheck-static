/** @type {import('@eslint/eslintrc').FlatCompat} */
const { FlatCompat } = require('@eslint/eslintrc');
/** @type {import('@eslint/js')} */
const eslintJs = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: eslintJs.configs.recommended,
  allConfig: eslintJs.configs.all,
});

/** @type {string[]} */
const ignores = [
  'dist/',
  'client/dist/',
  'build/',
  'node_modules/',
  'coverage/',
  '.nyc_output/',
  '*.log',
  '*.tmp',
  '*.temp',
  'client/public/assets/',
  'test-*.js',
];

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [{ ignores }, ...compat.config(require('./.eslintrc.json'))];
