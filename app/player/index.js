const html_temp = `
<html >
  <head>
    <title>{{title}}}</title>
    <meta charset="utf-8">
    <meta property="og:description" content="{{og:description}}" />
    <meta property="og:title" content="{{og:title}}" />
    <meta property="og:type" content="video.movie" />
    <meta property="og:url" content="{{og:url}}" />
    <meta property="og:image" content="{{og:image}}" />
    <meta property="og:image:type" content="image/png" />
    <link href="https://vjs.zencdn.net/7.11.4/video-js.css" rel="stylesheet" />
    <style type="text/css">
 html, body {
   height: 100%;
   margin: 0;
   overflow: hidden;
 }
</style>
  </head>
  <body>
    <video
    id="my-video"
    controls
    preload="auto"
    style="width=100%; height=100%;" class="video-js vjs-default-skin vjs-big-play-centered"
    
    poster="{{og:image}}"
    data-setup="{}"
  >
    <source src="{{videosrs}}" type="application/x-mpegURL" />

    <p class="vjs-no-js">
      To view this video please enable JavaScript, and consider upgrading to a
      web browser that
      <a href="https://videojs.com/html5-video-support/" target="_blank">
        supports HTML5 video
      </a>
    </p>
  </video>

<script src="https://vjs.zencdn.net/7.11.4/video.min.js"></script>  
  </body>
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

  const {
    url,
    protocol,
    headers: {host}
  } = req

  const autz = {
    company_id: 2,
    uid: 'testAdmin',
    timezone: 'Japan',
    is_admin: true
  }

  const full_url = `${protocol}://${host}${url}`.replace(/([?].*)/gi, '')
  console.log(full_url)
  //const {query, autz} = req

  const video = await this.videoService.getVideo({autz, cid: 2, uuid: vid})
  //   autz: {timezone: 'Japan', is_admin: 'true', uid: 'testAdmin'},
  //   cid: 2,
  //   uuid: vid
  // })

  console.log('html', video)
  const {video_title, video_description, video_output_file} = video[0]

  const img = video_output_file.replace(
    /manifest.m3u8/gi,
    'thumbnails/thumbnail-5_0.png'
  )
  const html = html_temp
    .replace(/{{og:url}}/gi, full_url)
    .replace(/{{title}}/gi, video_title)
    .replace(/{{og:title}}/gi, video_title)
    .replace(/{{og:image}}/gi, img)
    .replace(
      /{{og:description}}/gi,
      video_description !== null ? video_description : "It's a cool video"
    )
    .replace(/{{videosrs}}/gi, video_output_file)
  //const html = html_temp

  reply.type('text/html').send(html)
}
