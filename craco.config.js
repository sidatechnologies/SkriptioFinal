// Load configuration from environment or config file
const path = require('path');

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === 'true',
};

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // Always make build stable in container previews by avoiding HMR/WebSocket reliance
      const disable = config.disableHotReload || true; // default to disabling in this environment

      if (disable) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });
        // Disable watch mode (supervisor handles restarts)
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/,
        };
      } else {
        // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }
      return webpackConfig;
    },
  },
  devServer: (devServerConfig) => {
    // Server binding and routing for Kubernetes ingress
    devServerConfig.host = '0.0.0.0';
    devServerConfig.port = 3000;
    devServerConfig.allowedHosts = 'all';
    devServerConfig.historyApiFallback = true; // BrowserRouter support

    // Turn off hot reload & websockets to avoid cross-origin WSS failures in preview harness
    devServerConfig.hot = false;
    devServerConfig.liveReload = false;
    devServerConfig.webSocketServer = false;
    devServerConfig.client = {
      ...devServerConfig.client,
      overlay: false,
    };
    // IMPORTANT: Disable watching of the public/ directory to avoid ENOSPC in constrained environments
    if (devServerConfig.static) {
      devServerConfig.static = {
        ...devServerConfig.static,
        watch: false,
      };
    }
    // Also prevent dev-server from watching any files explicitly
    devServerConfig.watchFiles = [];
    return devServerConfig;
  },
};