const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')


module.exports = {
    // 代码映射图,方便调试
    devtool: 'eval-source-map',
    // 开发模式选择,共两种,分别是"development"和"production"
    mode: 'development',
    // 多入口文件
    entry: {
        index: './src/index.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'), // 指定构建生成文件所在路径
        filename: '[name]_bundle.js', // 指定构建生成的文件名
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: '/node_modules/'
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({template: './index.html'}),
        new MiniCssExtractPlugin({filename: '[name].css'}),
        new CopyWebpackPlugin([
                {
                    from: './static/css',
                    to: './static/css',
                    toType: 'dir'
                },
                {
                    from: './static/fonts',
                    to: './static/fonts',
                    toType: 'dir'
                }
            ]
            , {debug: 'info'})
    ],
    // 开发时使用的服务器
    devServer: {
        contentBase: "./dist/",
        port: 9000,
        inline: true,
        open: true
    }
};
