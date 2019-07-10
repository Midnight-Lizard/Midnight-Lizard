const path = require('path');
const glob = require('glob');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, args) => {
    /**
     * @param {string} entryName file path to the source entry .ts file
     * @param {string} bundleName file name of the bundle
     * */
    const sharedConfig = (entryName, bundleName) => ({
        entry: entryName,
        plugins: env && env.useBundleAnalyzer ? [
            new BundleAnalyzerPlugin({
                analyzerPort: 8000 + Math.round(Math.random() * 1000)
            })
        ] : [],
        module: {
            rules: [{
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }]
        },
        resolve: {
            extensions: ['.ts', '.js']
        },
        optimization: {
            minimize: false
        },
        output: {
            filename: bundleName,
            path: path.resolve(__dirname, 'js')
        }
    });

    const contentScriptConfig = sharedConfig(
        './ts/Chrome/ChromeContentScriptStarter.ts',
        'content-script.js');

    const popupConfig = sharedConfig(
        './ts/Chrome/ChromePopupStarter.ts',
        'popup.js');

    const backgroundPageConfig = sharedConfig(
        './ts/Chrome/ChromeBackgroundPageStarter.ts',
        'background-page.js');

    const pageScriptConfig = sharedConfig(
        './ts/PageScript/PageScriptStarter.ts',
        'page-script.js');

    const customEntries = glob.sync(path.resolve(__dirname, 'ts/Custom/*.ts'));
    const customConfigs = [];

    for (const customTsFile of customEntries) {
        customConfigs.push(sharedConfig(customTsFile,
            `custom/${path.basename(customTsFile, '.ts')}.js`))
    }

    return [
        contentScriptConfig, popupConfig,
        backgroundPageConfig, pageScriptConfig,
        ...customConfigs
    ];
};
