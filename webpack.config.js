const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
    target: 'node',
    context: __dirname + "/src/lightstep-graph",
    entry: './module.js',
    // watch: true,  // uncomment if you want "dev mode watching"
    devtool: 'source-map',
    output: {
        filename: "module.js",
        path: path.resolve(__dirname, 'dist/lightstep-graph'),
        libraryTarget: "amd"
    },
    externals: [
        'jquery', 'lodash', 'moment', 'tether-dropdown', 'angular',
        function (context, request, callback) {
            var prefix = 'grafana/';
            if (request.indexOf(prefix) === 0) {
                return callback(null, request.substr(prefix.length));
            }
            callback();
        },
    ],
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {from: 'plugin.json'},
                {from: '*.html'},
                {from: 'img', to: 'img'}
            ]
        })
    ],
    resolve: {},
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: [require('@babel/plugin-proposal-object-rest-spread')]
                    }
                }
            }
        ]
    }
}
