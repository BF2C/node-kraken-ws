const babel = require('rollup-plugin-babel')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')

let pluginOptions = [
  // multiEntry(),
  // eslint(),
  // progress(),
  // uglify(),
  // filesize({
  //   showGzippedSize: false,
  // })

  resolve(),
  commonjs({
    include: 'node_modules/**',
  }),
  babel({
    exclude: 'node_modules/**',
  }),
]

module.exports = {
  input: './src/index.js',
  output: {
    name: 'main',   // for external calls (need exports)
    file: 'build/index.js',
    format: 'cjs',
  },
  plugins: pluginOptions,
  external: [
    'crypto',
    'events',
    'fs',
    'http',
    'https',
    'net',
    'os',
    'path',
    'stream',
    'tls',
    'url',
    'zlib',
  ]
}
