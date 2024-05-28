module.exports = {
  extends: ['plugin:import/recommended'],
  rules: {
    'import/no-internal-modules': ['error'],
    'import/export': 'error',
    'import/extensions': ['error', 'never'],
    'import/no-cycle': 'error',
    'import/newline-after-import': 'error',
    'import/no-named-as-default': 'error',
    'import/no-named-as-default-member': 'error',
    'import/no-named-default': 'error',
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': 'error',
    'import/order': ['error', { 'newlines-between': 'never' }],
  },
}
