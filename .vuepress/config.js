module.exports = {
    title: 'ssv-liquidator 🎉',
    description: `An ultimateboilerplate wrote in typescript`,
    base: process.env.DEPLOY_ENV === 'gh-pages' ? '/ssv-liquidator/' : '/',
    themeConfig: {
        sidebar: [
            ['/', 'Introduction'],
            '/docs/development',
            '/docs/architecture',
        ],
    },
};
