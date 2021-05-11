import ts from '@rollup/plugin-typescript';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/rollup-plugin-vue-md.js',
            format: 'commonjs',
        },
        {
            file: 'dist/rollup-plugin-vue-md.mjs',
            format: 'module',
        },
    ],
    plugins: [ts()],
};
