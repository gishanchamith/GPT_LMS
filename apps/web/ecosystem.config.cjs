// PM2 process file for the single-server setup (website on the same EC2 host as the API).
// Build first (`npm run build -w @lp/web`, reads .env.production), then:
// `pm2 start ecosystem.config.cjs && pm2 save`
module.exports = {
  apps: [
    {
      name: 'lp-web',
      cwd: __dirname,
      // npm workspaces hoist next to the repo root, so resolve it instead of hardcoding the path.
      script: require.resolve('next/dist/bin/next', { paths: [__dirname] }),
      args: 'start -p 3000 -H 127.0.0.1',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      time: true,
    },
  ],
};
