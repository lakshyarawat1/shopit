const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, resolve } = require('path');

module.exports = {
  node: {
    __dirname: false,
    __filename: false,
  },
  output: {
    path: join(__dirname, 'dist'),
  },
  resolve: {
    alias: { '@packages': resolve(__dirname, '../../packages') },
    extensions: ['.js', '.ts'],
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
};
