/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  async redirects() {
    return [
      // Interesses e hobbies virou a home. Redirect de verdade (308 com
      // Location) para links já compartilhados e para os buscadores.
      { source: '/interesses', destination: '/', permanent: true },
    ];
  }
};

module.exports = nextConfig;
