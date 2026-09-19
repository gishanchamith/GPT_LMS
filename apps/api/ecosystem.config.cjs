// PM2 process file for the EC2 host. Build first (`npm run build`), then:
// `pm2 start ecosystem.config.cjs && pm2 save`
module.exports = {
  apps: [
    {
      name: 'lp-api',
      cwd: __dirname,
      script: 'dist/server.js',
      node_args: '--env-file=.env --enable-source-maps',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
      // The server closes the HTTP server and Mongo connection on SIGINT/SIGTERM.
      kill_timeout: 5000,
      time: true,
    },
  ],
};
