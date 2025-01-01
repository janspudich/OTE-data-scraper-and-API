import globals from 'globals';
import pluginJs from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import {FlatCompat} from '@eslint/eslintrc';
import {fileURLToPath} from 'url';
import path from 'path';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname, // Optional, default to process.cwd()
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  jsdoc.configs['flat/recommended'],
  ...compat.extends('google'),
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
//  },
//  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
//  },
//  {
    rules: {
      'no-extra-semi': 'error',
      'brace-style': [2, 'stroustrup'],
      'indent': [
        2, 2, {
          'CallExpression': {
            'arguments': 1, // in eslint-config-google, this is set to 2
          },
          'FunctionDeclaration': {
            'body': 1,
            'parameters': 2,
          },
          'FunctionExpression': {
            'body': 1,
            'parameters': 2,
          },
          'MemberExpression': 2,
          'ObjectExpression': 1,
          'SwitchCase': 1,
          'ignoredNodes': [
            'ConditionalExpression',
          ],
        },
      ],
    },
  },
];
