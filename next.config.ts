import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['ibm_db'],
  experimental: {
    turbo: {
      rules: {
        // Add any custom turbo rules here if needed
      },
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle native modules like ibm_db that can't be bundled
      config.externals.push('ibm_db');
    }
    return config;
  },
};

export default nextConfig;
