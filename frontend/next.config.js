/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        allowedDevOrigins: process.env.NODE_ENV === 'development' 
            ? ['http://localhost:3000', 'http://192.168.68.58:3000']
            : [],
    },
    env: {
        AI_SERVICE_URL: process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8088',
        USER_SERVICE_URL: process.env.REACT_APP_USER_SERVICE_URL || 'http://localhost:8081',
        ACCOUNTS_SERVICE_URL: process.env.REACT_APP_ACCOUNTS_SERVICE_URL || 'http://localhost:8082',
        PROJECTS_SERVICE_URL: process.env.REACT_APP_PROJECTS_SERVICE_URL || 'http://localhost:8083',
        TASKS_SERVICE_URL: process.env.REACT_APP_TASKS_SERVICE_URL || 'http://localhost:8084',
        FILE_SERVICE_URL: process.env.REACT_APP_FILE_SERVICE_URL || 'http://localhost:8085',
        SPRINTS_SERVICE_URL: process.env.REACT_APP_SPRINTS_SERVICE_URL || 'http://localhost:8086',
        NOTIFICATIONS_SERVICE_URL: process.env.REACT_APP_NOTIFICATIONS_SERVICE_URL || 'http://localhost:8087',
    },
    async rewrites() {
        return [
            {
                source: '/api/attachments/:path*',
                destination: `${process.env.REACT_APP_FILE_SERVICE_URL || 'http://localhost:8085'}/api/attachments/:path*`,
            },
            {
                source: '/api/tasks/:path*',
                destination: `${process.env.REACT_APP_TASKS_SERVICE_URL || 'http://localhost:8084'}/api/tasks/:path*`,
            },
            {
                source: '/api/users/:path*',
                destination: `${process.env.REACT_APP_USER_SERVICE_URL || 'http://localhost:8081'}/api/users/:path*`,
            },
            {
                source: '/api/projects/:path*',
                destination: `${process.env.REACT_APP_PROJECTS_SERVICE_URL || 'http://localhost:8083'}/api/projects/:path*`,
            },
            {
                source: '/api/ai/:path*',
                destination: `${process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8088'}/api/:path*`,
            },
        ];
    },
}

module.exports = nextConfig
