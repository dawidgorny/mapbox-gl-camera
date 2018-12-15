const path = require('path');
const webpack = require('webpack');

module.exports = env => {
  return {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
      contentBase: './examples/'
    },
    entry: {
      regl: './examples/regl.js'
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'examples/dist/')
    },
    plugins: [
      new webpack.EnvironmentPlugin(['MAPBOX_TOKEN'])
    ]
  };
};
