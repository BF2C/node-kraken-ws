const tasks = arr => arr.join(' && ')

module.exports = {
    hooks: {
      'pre-push': 'yarn eslint:check',
    },
}
