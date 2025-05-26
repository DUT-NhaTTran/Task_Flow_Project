/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        allowedDevOrigins: ['http://192.168.68.58:3000'],
    },
    async rewrites() {
        return [
            {
                source: '/api/attachments/:path*',
                destination: 'http://localhost:8087/api/attachments/:path*', // File-Service port
            },
            {
                source: '/api/tasks/:path*',
                destination: 'http://localhost:8081/api/tasks/:path*', // Tasks-Service port  
            },
        ]
    },
}

module.exports = nextConfig
