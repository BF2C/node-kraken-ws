import babel from 'rollup-plugin-babel'
import eslint from 'rollup-plugin-eslint'
import resolve from 'rollup-plugin-node-resolve'
import multiEntry from 'rollup-plugin-multi-entry'
import uglify from 'rollup-plugin-uglify'
import filesize from 'rollup-plugin-filesize'
import commonjs from 'rollup-plugin-commonjs'
import progress from 'rollup-plugin-progress'

let pluginOptions = [
  multiEntry(),
  resolve({
    jsnext: true,
    browser: true
  }),
  commonjs(),
  eslint(),
  progress(),
  babel({
    exclude: 'node_modules/**',
  }),
  uglify(),
  filesize({
    showGzippedSize: false,
  })
]

export default [
  {
    input: './src/js/index.es6',
    output: {
      name: 'main',   // for external calls (need exports)
      file: 'dist/js/index.min.js',
      format: 'umd',
    },
    plugins: pluginOptions,
  },
]
