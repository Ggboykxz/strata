/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Fixed build id keeps the prerendered page byte-identical across builds
  // when apps/dashboard/dist/data.json is unchanged.
  generateBuildId: () => 'strata-dashboard-next',
};

export default nextConfig;
