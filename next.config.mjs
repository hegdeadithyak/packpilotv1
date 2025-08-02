/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Add rule for loading .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Add rule for worker files
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      },
    });

    // Prevent parsing of Rapier WASM files
    config.module.noParse = /rapier_wasm.*\.wasm$/;

    return config;
  },

  // Experimental features (excluding esmExternals)
  experimental: {
    // Add other experimental flags here if needed
  },

  // Ignore TypeScript build errors
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
