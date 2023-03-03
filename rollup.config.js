import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';
import { terser } from "rollup-plugin-terser";

export default [{
  input: 'src/energy-overview-card.ts',
  output: {
    file: './dist/energy-overview-card.js',
    format: 'es',
    inlineDynamicImports: true,
  },
  context: "window",
  plugins: [
    typescript({
      declaration: false,
    }),
    nodeResolve(),
    json(),
    commonjs(),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: "bundled",
    }),
    terser(),
  ],
}];
