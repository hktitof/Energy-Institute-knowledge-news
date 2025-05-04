import bundleAnalyzer from '@next/bundle-analyzer';
// Create the bundle analyzer
const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});
const nextConfig = {
    reactStrictMode: true,
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value: "script-src 'self' 'unsafe-eval';",
                    },
                ],
            },
        ];
    },
};
export default withBundleAnalyzer(nextConfig);
