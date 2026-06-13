/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Prevent Windows file-lock 500 errors by forcing in-memory caching
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
};

// Trigger redeploy to load Vercel Blob environment variables
export default nextConfig;
