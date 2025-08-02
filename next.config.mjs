
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    }

    // Add WASM file handling
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    })

    // Handle worker files
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      },
    })

    // Don't parse RAPIER WASM files
    config.module.noParse = /rapier_wasm.*\.wasm$/

    return config
  },
  // Remove the problematic esmExternals configuration
  experimental: {
    // Keep other experimental features but remove esmExternals
  },
}

export default nextConfig
