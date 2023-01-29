import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import babel from 'rollup-plugin-babel';
import { terser } from "rollup-plugin-terser";

export default {
  input: ['src/energy-overview-card.ts'],
  output: {
    dir: './dist',
    format: 'es',
  },
  plugins: [
    resolve(),
    typescript(),
    babel({
      exclude: 'node_modules/**'
    }),
    terser()]
};
