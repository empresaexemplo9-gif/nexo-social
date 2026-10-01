/** @type {import('next').NextConfig} */
const nextConfig = {
  // O build checa os tipos: um erro de TypeScript não chega à produção.
  typescript: { ignoreBuildErrors: false },
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
