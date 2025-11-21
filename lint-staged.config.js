module.exports = {
  '**.{js,jsx,ts,tsx}': [
    'nx run-many -t pretty',
    'nx run-many -t format',
    'prettier --write "**/*.ts"',
  ],
  '**/*.ts?(x)': () => 'nx run-many -t pretty',
  '*.{json,yaml}': ['nx run-many -t pretty'],
};
