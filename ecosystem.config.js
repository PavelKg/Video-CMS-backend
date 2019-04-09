module.exports = {
  apps : [{
    name      : 'Video-CMS-back',
    script    : 'server.js',
    env: {
      NODE_ENV: 'development',
      NODE_PORT: 8769
    },
    env_production : {
      NODE_ENV: 'production',
      NODE_PORT: 8769
    }
  }],
  deploy : {
    production : {
      user : 'videocms',
      host : 'vcms.pepex.kg',
      ref  : 'origin/master',
      repo : 'git@github.com:PavelKg/Video-CMS-backend.git',
      path : '~/services/videocms-backend',
      'post-deploy' : 'npm i && pm2 startOrRestart ecosystem.config.js --env production'
    },
    development : {
      user : 'videocms',
      host : 'vcms.pepex.kg',
      ref  : 'origin/development',
      repo : 'git@github.com:PavelKg/Video-CMS-backend.git',
      path : '~/services/videocms-backend',
      'post-deploy' : 'npm i &&  pm2 startOrRestart ecosystem.config.js --env development'
    }
  }
}; 