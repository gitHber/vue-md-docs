import * as rollup from 'rollup';
import vue from 'rollup-plugin-vue';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import ts from '@rollup/plugin-typescript';
import html from '@rollup/plugin-html';
import replace from 'rollup-plugin-replace';
import liveServer from 'rollup-plugin-live-server';
import vueMarkdown from 'rollup-plugin-vue-md';

const inputOptions = {
    input: './src/main.ts',
    plugins: [
        vue({
            // target: 'browser',
            exposeFilename: true,
            css: true,
        }),
        vueMarkdown(),
        ts(),
        commonjs(),
        resolve(),
        replace({
            'process.env.NODE_ENV': JSON.stringify('development'),
            'process.env.VUE_ENV': JSON.stringify('browser'),
        }),
        html({
            title: 'VueMarkdownPluginDemo',
            meta: [{ charset: 'utf-8' }],
            template({ attributes, meta, title, files }) {
                return `
                    <!DOCTYPE html>
                    <html ${Object.entries(attributes.html)
                        .map(([k, v]) => `${k}="${v}"`)
                        .join(' ')}>
                    <head>
                        ${meta.map(
                            (m) =>
                                `<meta ${Object.entries(m)
                                    .map(([k, v]) => `${k}="${v}"`)
                                    .join(' ')}>`
                        )}
                        <title>${title}</title>
                    </head>
                    <body>
                        <div id="app"></div>
                        ${files.js.map(
                            (file) => `<script src="${file.fileName}"></script>`
                        )}
                    </body>
                    </html>
                `;
            },
        }),
        liveServer({
            port: 8888,
        }),
    ],
};
const outputOptions = {
    dir: 'dist',
    format: 'iife',
    sourceMap: true,
};
async function build() {
    const bundle = await rollup.rollup(inputOptions);
    await bundle.generate(outputOptions);
    await bundle.write(outputOptions);
}

build();
