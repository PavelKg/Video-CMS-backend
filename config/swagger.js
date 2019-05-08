exports.options = {
  routePrefix: '/documentation',
  exposeRoute: true,
  docExpansion: 'none',
  swagger: {
    info: {
      title: 'Video-CMS API',
      description: 'Video-CMS backend API',
      version: '0.1.0'
    },
    display: {docExpansion: 'none'},
    host: 'localhost',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      {name: 'person', description: 'Auth related end-points'},
      {name: 'companies', description: 'Companies related end-points'},
      {name: 'users', description: 'Companies users related end-points'},
      {name: 'roles', description: 'Companies roles related end-points'},
      {name: 'groups', description: 'Companies groups related end-points'}
    ],
    securityDefinitions: Object
  }
}