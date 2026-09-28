/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["metaapi.cloud-sdk"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      // Keep MetaApi SDK as external require at runtime
      if (Array.isArray(config.externals)) {
        config.externals.push("metaapi.cloud-sdk");
      }
    }
    return config;
  },
};

export default nextConfig;
