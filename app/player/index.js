const videos = require('../companies/videos')

const html_temp = `
<html >
  <head>
    <title>The Rock (1996)</title>
    <meta name="description" content="A mild-mannered chemist and an ex-con must lead the counterstrike" />
    <meta property="og:description" content="A mild-mannered chemist and an ex-con must lead the counterstrike" />
    <meta property="og:title" content="The Rock11" />
    <meta property="og:type" content="video.movie" />
    <meta property="og:url" content="https://botkg.ga/player" />
    <meta property="og:image" content="https://miro.medium.com/max/1838/1*mk1-6aYaf_Bes1E3Imhc0A.jpeg" />
    <meta property="og:image:type" content="image/jpeg" />
  </head>
  <body><H1>AAAABBB</h1></body>
</html>`
module.exports = async function (fastify, opts) {
  fastify.get('/:vid', getPlayer)
}

module.exports[Symbol.for('plugin-meta')] = {
  decorators: {
    fastify: ['authPreValidation', 'autzPreHandler', 'videoService']
  }
}
async function getPlayer(req, reply) {
  const {vid} = req.params
  const {app, val} = req.query

  const {query, autz} = req
  console.log(typeof this.commentService)
  // const video = await this.videoService.getVideoHandler({
  //   autz: {timezone: 'Japan', is_admin: 'true', uid: 'testAdmin'},
  //   cid: 2,
  //   uuid: vid
  // })

  // console.log('html', video)
  const html = html_temp
  reply.type('text/html').send(html)
}
