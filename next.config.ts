import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['ibm_db'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle native modules like ibm_db that can't be bundled
      config.externals.push('ibm_db');
    }
    return config;
  },
};

export default nextConfig;
