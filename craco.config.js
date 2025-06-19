const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Lepsze fallbacks
      webpackConfig.resolve.fallback = {
        "buffer": require.resolve("buffer"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "http": false,
        "https": false,
        "os": require.resolve("os-browserify/browser"),
        "url": require.resolve("url"),
        "path": require.resolve("path-browserify"),
        "fs": false,
        "net": false,
        "tls": false,
        "util": require.resolve("util"),
        "process": require.resolve("process/browser.js"),  // POPRAWKA: dodane .js
        "zlib": false
      };
      
      // Globalne zmienne
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser.js',  // POPRAWKA: dodane .js
        })
      );

      // Dodatkowa konfiguracja dla ESM modułów
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      // Ignorowanie source map warnings
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Module Warning/
      ];
      
      return webpackConfig;
    },
  },
  // Wyłącz niektóre ESLint błędy
  eslint: {
    enable: true,
    mode: 'extends',
    configure: {
      rules: {
        'import/first': 'off',
        'no-unused-vars': 'warn'
      }
    }
  }
};