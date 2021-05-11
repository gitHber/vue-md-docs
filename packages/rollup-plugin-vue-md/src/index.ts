// https://www.rollupjs.com/guide/plugin-development
import fs from 'fs';
import parse from 'remark-parse';
import unified from 'unified';
import { Plugin } from 'rollup';

type Tags =
    | 'heading'
    | 'paragraph'
    | 'text'
    | 'html'
    | 'code'
    | 'inlineCode'
    | 'strong'
    | 'list';
interface Point {
    line: number;
    /**
     * Column in a source file (1-indexed integer).
     */
    column: number;
    /**
     * Character in a source file (0-indexed integer).
     */
    offset?: number;
}
interface MdNode {
    children?: MdNode[];
    value?: string;
    type: Tags;
    depth?: number;
    /**
     * Information from the ecosystem.
     */
    data?: Record<string, any>;

    /**
     * Location of a node in a source document.
     * Must not be present if a node is generated.
     */
    position?: {
        start: Point;

        /**
         * Place of the first character after the parsed source region.
         */
        end: Point;

        /**
         * Start column at each index (plus start line) in the source region,
         * for elements that span multiple lines.
         */
        indent?: number[];
    };
}

const EXT = '.vue.md';
const TEMP_FILES = new Set<string>();

function createVueFile(id: string, componentName: string, content: string) {
    const filePath = `${id}.${componentName}.vue`;
    fs.writeFileSync(filePath, content);
    TEMP_FILES.add(filePath);
    return filePath;
}

function parseVueMd(content: string, id: string) {
    const ast = unified().use(parse).parse(content) as MdNode;
    let index = 0;
    const dependencies: Array<Record<'componentName' | 'code', string>> = [];
    let template = transformMdToVue(ast.children!, {
        code(node: MdNode) {
            const componentName = `Block${index++}`;
            dependencies.push({
                componentName: componentName,
                code: node.value!,
            });
            return `
                <${componentName} />
                <code v-text="'${node
                    .value!.replace(/\s/g, '\\n')
                    .replace(/\$/g, '\\$')
                    .replace(/'/g, "\\'")
                    .replace(/"/g, '&quot;')
                    .replace(/\</g, '&lt;')
                    .replace(/\>/g, '&gt;')}'"></code>
            `;
        },
    });
    const entryCode = `
        <template>
            <div>
                ${template}
            </div>
        </template>
        <script>
            ${dependencies
                .map(({ componentName, code }) => {
                    let componentPath = createVueFile(id, componentName, code);
                    return `import ${componentName} from "${componentPath}"`;
                })
                .join(';')}
            export default {
                components: {
                    ${dependencies
                        .map(({ componentName, code }) => {
                            return `${componentName}`;
                        })
                        .join(',')}
                }
            }
        </script>
    `;
    const entry = 'Entry';
    const entryPath = createVueFile(id, entry, entryCode);
    const code = `
        import ${entry} from '${entryPath}';
        export default ${entry};
    `;
    return {
        code,
        meta: {},
    };
}

// md AST 转换成html
function transformMdToVue(
    nodes: MdNode[],
    handlers: Partial<Record<Tags, (node: MdNode) => string>> = {}
) {
    const defaultHandler: Record<Tags, (node: MdNode) => string> = {
        heading(node) {
            return `
                    <h${node.depth}>
                       ${transformMdToVue(node.children as MdNode[])} 
                    </h${node.depth}>
                `;
        },
        paragraph(node) {
            return `<p>${transformMdToVue(node.children as MdNode[])}</p>`;
        },
        text(node) {
            return node.value!;
        },
        html(node) {
            return node.value!;
        },
        code(node) {
            return `
                    <code v-html="'node.value'"></code>
                `;
        },
        inlineCode(node) {
            return `
                    <b>${node.value}</b>
                `;
        },
        strong(node) {
            return `
                    <strong>${transformMdToVue(node.children!)}</strong>
                `;
        },
        list(node) {
            // TODO: list 需要对有序和无序做处理
            // TODO: 还有 tableCell tableRow
            return `
                <li>${node.value}</li>
            `;
        },
    };
    return nodes
        .map((node) => {
            return handlers[node.type]
                ? handlers[node.type]!(node)
                : defaultHandler[node.type](node);
        })
        .join('');
}

export default function Markdown(): Plugin {
    return {
        name: 'vue-markdown',
        // 构建阶段钩子(rollup.rollup)
        // 这种hook有四种类型
        // 1. async 这类hook返回一个promise作为异步，否则视为同步
        // 2. first 多个插件实现的话，会顺序执行，直到其中一个不返回null或undefined
        // 3. sequential 多个插件实现的话会顺序执行，异步也会等待
        // 4. parallel 与上面类似，但是异步不会等，直接执行下一个

        // 类型: async, sequential
        // 后: buildStart
        // 处理修改rollup.rollup的options，return null 不修改
        options(options) {
            return null;
        },
        // 类型: async, parallel
        // 前: options 后: resolveId
        // rollup.rollup开始触发，可以用来校验参数
        buildStart(options) {
            const dependendPlugin = 'VuePlugin'; // vue3改成了'vue'
            if (
                !options.plugins.find(
                    (plugin) => dependendPlugin === plugin.name
                )
            ) {
                throw new Error(
                    `vue-markdown plugin depends on "${dependendPlugin}" plugin`
                );
            }
        },
        // 类型: async, parallel
        // 前: moduleParsed、resolveId、resolveDynamicImport 后: outputOption
        // 完成打包时触发，在generate和write之前触发
        buildEnd() {
            TEMP_FILES.forEach((filePath) => {
                fs.rm(filePath, (err) => {
                    if (err) {
                        this.error(err);
                    }
                });
            });
        },
        // 类型: async, first
        // 前: 解析入口是buildStart，解析一个import是moduleParsed 后: load(模块未加载)或buildEnd
        // 可以在构建阶段，通过this.emitFile去发出一个入口时触发，或者调用this.resolve 去加载一个id触发
        // source: 引入该模块的地址名(import * from 'xx'), importer: 什么地方引入的， 返回false则表示外部模块
        async resolveId(source, importer) {
            // this.resolve
            return null;
        },
        async resolveDynamicImport(specifier, importer) {
            // this.resolve
            return null;
        },
        // 类型: async, first
        // 前: resolveId、resolveDynamicImport 后: transform
        //
        // 自定义的加载器，返回加载的内容
        async load(id) {
            return null;
        },
        // 类型: async, sequential
        // 前: load 后: moduleParsed
        //
        // 代码转换
        transform(code, id) {
            // this.parse 解析ast
            if (id.endsWith(EXT)) {
                const temp = parseVueMd(code, id);
                return temp;
            }
            return null;
        },
        // 类型: async, parallel
        // 前: transform 后: resolveId
        //
        // 在每次代码被完全parsed触发，
        moduleParsed(moduleInfo) {},

        // 类型: sync, sequential
        // generation 阶段会被触发
        //
        // 每次代码重新构建触发
        watchChange() {},

        // 输出阶段钩子(rollup.generate)
        // 提供生成包的信息，可以再构建完成修改构建

        // 类型: sync, sequential
        // 前：renderDynamicImport 后：resolveFileUrl
        //
        // 可以给单独的模块添加hash
        augmentChunkHash(chunkInfo) {},
        // 类型: async, parallel
        // 前：buildEnd 后：resolveFileUrl
        // 可用于清除可能正在运行的任何外部服务。 Rollup的CLI将确保在每次运行后都调用此挂钩，但是JavaScript API的用户有责任在生成捆绑包后手动调用bundle.close（）。 因此，任何依赖此功能的插件都应在其文档中仔细提及。
        // 如果插件希望在监视模式下跨构建保留资源，则可以在此挂钩中检查this.meta.watchMode并在closeWatcher中对监视模式执行必要的清理。
        closeBundle() {},
        // 类型: async, sequential
        // 前：renderChunk 后：writeBundle
        // 在bundle.generate()结尾调用，或者在文件写入bundle.write()之前调用,
        // 可以用来删除某些文件，this.emitFile添加文件
        generateBundle(options, bundle) {},
        outputOptions(options) {
            return null;
        },
        intro() {
            return '';
        },
        outro() {
            return '';
        },
        // 类型: async, sequential
        // 前：resolveFileUrl 后：generateBundle
        // 可用于转换单个块。为每个Rollup输出块文件调用。返回null不会应用任何转换。
        renderChunk() {
            return null;
        },
        renderDynamicImport() {
            return null;
        },
        renderError() {},
        renderStart() {},
        //
        resolveFileUrl() {
            return null;
        },
        // 类型: async, parallel
        // 前：renderStart 后：renderDynamicImport
        banner() {
            return '// BANNER';
        },
        footer() {
            return '// FOOTER';
        },
    };
}
