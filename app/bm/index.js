//const Promise = require('bluebird');
const manifestName = 'manifest.m3u8'
const OUTPUT_FOLDER = '/' //'/videocms'
const ENCODING_NAME = () => {
  return `vcms_encoding_${new Date().getTime() / 1000}`
}

class BitmovinService {
  constructor(bitmovin) {
    this.bitmovin = bitmovin
  }

  async createEncoding(encoding) {
    const encodingPromise = this.bitmovin.encoding.encodings.create(encoding)

    return new Promise((resolve, reject) => {
      encodingPromise
        .then((createdEncoding) => {
          console.log('encoding ' + encoding.name + ' successfully created')
          resolve(createdEncoding)
        })
        .catch((error) => {
          console.error('error creating encoding ' + encoding.name)
          reject(error)
        })
    })
  }

  async addStreamToEncoding(
    input,
    output,
    codecConfiguration,
    encoding,
    INPUT_FILE_PATH,
    OUTPUT_PATH
  ) {
    const inputStream = {
      inputId: input.id,
      inputPath: INPUT_FILE_PATH,
      selectionMode: 'AUTO'
    }

    let stream = {
      inputStreams: [inputStream],
      codecConfigId: codecConfiguration.id
    }

    return new Promise((resolve, reject) => {
      this.addStream(encoding, stream, output, codecConfiguration, OUTPUT_PATH)
        .then(([addedStream, addedMuxing]) => {
          console.log('Successfully created stream and muxing!')
          resolve([addedStream, addedMuxing])
        })
        .catch((error) => {
          console.error('Unable to create stream and/or muxing.')
          reject(error)
        })
    })
  }

  async addStream(encoding, stream, output, codecConfiguration, OUTPUT_PATH) {
    const addStreamPromise = this.bitmovin.encoding
      .encodings(encoding.id)
      .streams.add(stream)

    return new Promise((resolve, reject) => {
      addStreamPromise
        .then((addedStream) => {
          console.log('stream resource successfully added')

          let prefix

          if (codecConfiguration.height || codecConfiguration.width) {
            if (codecConfiguration.height)
              prefix = 'video/' + codecConfiguration.height
            else if (codecConfiguration.width)
              prefix = 'video/' + codecConfiguration.width
          } else {
            prefix = 'audio/' + codecConfiguration.bitrate
          }

          prefix += '/'
          // this.addFmp4MuxingForStream(
          //   encoding,
          //   addedStream,
          //   output,
          //   prefix,
          //   OUTPUT_PATH
          // ).then((addedFmp4Muxing) => {
          this.addTsMuxingForStream(
            encoding,
            addedStream,
            output,
            prefix,
            OUTPUT_PATH
          ).then((addedTsMuxing) => {
            const muxingWithPath = {
              //fmp4Muxing: addedFmp4Muxing,
              tsMuxing: addedTsMuxing,
              path: prefix
            }
            resolve([addedStream, muxingWithPath])
          })
          //})
        })
        .catch((error) => {
          console.error('unable to add stream to encoding', error)
          reject(error)
        })
    })
  }

  async addFmp4MuxingForStream(
    encoding,
    stream,
    output,
    output_prefix,
    OUTPUT_PATH
  ) {
    let fmp4Muxing = {
      name: 'FMP4 ' + output_prefix,
      streams: [
        {
          streamId: stream.id
        }
      ],
      outputs: [
        {
          outputId: output.id,
          outputPath: OUTPUT_PATH + output_prefix,
          acl: [
            {
              permission: 'PUBLIC_READ'
            }
          ]
        }
      ],
      segmentLength: 4,
      segmentNaming: 'seg_%number%.m4s',
      initSegmentName: 'init.mp4'
    }

    const addMuxingPromise = this.bitmovin.encoding
      .encodings(encoding.id)
      .muxings.fmp4.add(fmp4Muxing)

    return new Promise((resolve, reject) => {
      addMuxingPromise
        .then((addedFMP4Muxing) => {
          console.log('added fmp4 muxing ' + fmp4Muxing.name)
          resolve(addedFMP4Muxing)
        })
        .catch((error) => {
          console.error('error adding fmp4 muxing ' + fmp4Muxing.name, error)
          reject(error)
        })
    })
  }

  async addTsMuxingForStream(
    encoding,
    stream,
    output,
    output_prefix,
    OUTPUT_PATH
  ) {
    let tsMuxing = {
      name: 'TS ' + output_prefix,
      streams: [
        {
          streamId: stream.id
        }
      ],
      outputs: [
        {
          outputId: output.id,
          outputPath: OUTPUT_PATH + output_prefix,
          acl: [
            {
              permission: 'PUBLIC_READ'
            }
          ]
        }
      ],
      segmentLength: 4,
      segmentNaming: 'seg_%number%.ts'
    }

    const addMuxingPromise = this.bitmovin.encoding
      .encodings(encoding.id)
      .muxings.ts.add(tsMuxing)

    return new Promise((resolve, reject) => {
      addMuxingPromise
        .then((addedTSMuxing) => {
          //console.log('added ts muxing ' + tsMuxing.name)
          resolve(addedTSMuxing)
        })
        .catch((error) => {
          console.error('error adding ts muxing ' + tsMuxing.name, error)
          reject(error)
        })
    })
  }

  async createHlsManifest(
    output,
    encoding,
    audioMuxingsWithPath,
    videoMuxingsWithPath,
    OUTPUT_PATH
  ) {
    return new Promise((resolve) => {
      this.createHlsManifestResource(output, OUTPUT_PATH).then(
        (createdHlsManifest) => {
          let audioPromise

          if (audioMuxingsWithPath.length > 0) {
            let promise = Promise.all(
              audioMuxingsWithPath.map(async (audioMuxingWithPath) => {
                //console.log('audioMuxingWithPath=', audioMuxingWithPath)
                const tsMuxing = audioMuxingWithPath.tsMuxing
                const path = audioMuxingWithPath.path

                const audioMedia = {
                  groupId: 'audio_group',
                  name: 'Audio media ' + tsMuxing.name,
                  segmentPath: path,
                  encodingId: encoding.id,
                  muxingId: tsMuxing.id,
                  streamId: audioMuxingWithPath.streamId,
                  language: 'en',
                  uri: 'videomedia.m3u8'
                }
                return await this.bitmovin.encoding.manifests
                  .hls(createdHlsManifest.id)
                  .media.audio.add(audioMedia)
              })
            )
            audioPromise = promise
          } else {
            audioPromise = Promise.resolve(null)
          }

          audioPromise.then((result) => {
            let audio_group = 'audio_group'
            if (result === null) {
              audio_group = null
            }

            let videoPromise
            if (videoMuxingsWithPath.length > 0) {
              videoPromise = Promise.all(
                videoMuxingsWithPath.map(async (videoMuxingWithPath) => {
                  const uri =
                    'video_' +
                    videoMuxingWithPath.path.split('/')[
                      videoMuxingWithPath.path.split('/').length - 2
                    ] +
                    '.m3u8'

                  const variantStream = {
                    audio: audio_group,
                    closedCaptions: 'NONE',
                    segmentPath: videoMuxingWithPath.path,
                    uri: uri,
                    encodingId: encoding.id,
                    streamId: videoMuxingWithPath.streamId,
                    muxingId: videoMuxingWithPath.tsMuxing.id
                  }

                  return await this.bitmovin.encoding.manifests
                    .hls(createdHlsManifest.id)
                    .streams.add(variantStream)
                })
              )
            } else {
              videoPromise = Promise.resolve(null)
            }

            videoPromise.then(() => {
              console.log(
                'Successfully created HLS Manifest with Video/Audio Media entries.'
              )
              resolve(createdHlsManifest)
            })
          })
        }
      )
    }).catch((error) => {
      console.log('Unable to create HLS manifest', error)
      throw error
    })
  }

  async createHlsManifestResource(output, OUTPUT_PATH) {
    const manifest = {
      name: 'Sample Encoding Manifest ' + ENCODING_NAME(),
      outputs: [
        {
          outputId: output.id,
          outputPath: OUTPUT_PATH,
          acl: [
            {
              permission: 'PUBLIC_READ'
            }
          ]
        }
      ],
      manifestName: manifestName
    }

    return new Promise((resolve, reject) => {
      this.bitmovin.encoding.manifests.hls
        .create(manifest)
        .then((createdManifest) => {
          console.log('successfully created hls manifest resource')
          resolve(createdManifest)
        })
        .catch((error) => {
          console.error('error creating hls manifest resource', error)
          reject(error)
        })
    })
  }

  async startHlsManifestCreation(manifest) {
    const startPromise = this.bitmovin.encoding.manifests
      .hls(manifest.id)
      .start()

    return new Promise((resolve, reject) => {
      startPromise.then(() => {
        this.waitUntilHlsManifestFinished(manifest)
          .then((success) => {
            console.log('hls manifest finished', success)
            resolve(true)
          })
          .catch((error) => {
            console.log('hls manifest errored', error)
            reject(error)
          })
      })
    })
  }

  async waitUntilHlsManifestFinished(manifest) {
    return new Promise((resolve, reject) => {
      const waitForManifestToBeFinished = () => {
        console.log('GET STATUS FOR HLS MANIFEST WITH ID ', manifest.id)
        this.bitmovin.encoding.manifests
          .hls(manifest.id)
          .status()
          .then((response) => {
            console.log('HLS Manifest status is ' + response.status)

            if (response.status === 'FINISHED') {
              return resolve(response.status)
            }

            if (response.status === 'ERROR') {
              return reject(response.status)
            }

            setTimeout(waitForManifestToBeFinished, 10000)
          })
      }
      waitForManifestToBeFinished()
    })
  }

  async startEncodingAndWaitForItToBeFinished(encoding) {
    const startPromise = this.bitmovin.encoding.encodings(encoding.id).start()

    return new Promise((resolve, reject) => {
      startPromise.then(() => {
        this.waitUntilEncodingFinished(encoding)
          .then((success) => {
            console.log('dash encoding finished', success)
            resolve(true)
          })
          .catch((error) => {
            console.log('dash encoding errored', error)
            reject(error)
          })
      })
    })
  }

  async waitUntilEncodingFinished(encoding) {
    return new Promise((resolve, reject) => {
      const waitForEncodingToBeFinishedOrError = () => {
        console.log('GET STATUS FOR ENCODING WITH ID ', encoding.id)
        this.bitmovin.encoding
          .encodings(encoding.id)
          .status()
          .then((response) => {
            console.log('Encoding status is ' + response.status)

            if (response.status === 'FINISHED') {
              return resolve(response.status)
            }

            if (response.status === 'ERROR') {
              return reject(response.status)
            }

            setTimeout(waitForEncodingToBeFinishedOrError, 10000)
          })
      }
      waitForEncodingToBeFinishedOrError()
    })
  }

  async createThumbnail(
    output,
    encoding,
    stream,
    thumbnail,
    THUMBNAIL_OUTPUT_PATH
  ) {
    let thumbnailRequest = Object.assign({}, thumbnail, {
      outputs: [
        {
          outputId: output.id,
          outputPath: THUMBNAIL_OUTPUT_PATH
        }
      ]
    })
    return this.bitmovin.encoding
      .encodings(encoding.id)
      .streams(stream.id)
      .thumbnails.add(thumbnailRequest)
  }

  async getThumbnailImage(encoding_id, stream_id, thumbnail_id) {
    return this.bitmovin.encoding
      .encodings(encoding_id)
      .streams(stream_id)
      .thumbnails(thumbnail_id)
      .customData()
  }

  async videoEncode(cid, uuid, file_ext) {
    //console.log('file_ext=', file_ext)
    const {
      BITMOVIN_GCS_INPUT_KEY,
      BITMOVIN_GCS_OUTPUT_KEY,
      BITMOVIN_VIDEO_CODEC_KEY,
      BITMOVIN_AUDIO_CODEC_KEY
    } = process.env

    const INPUT_FILE_PATH = `${uuid}.${file_ext}`
    const encodingResource = {
      name: INPUT_FILE_PATH //ENCODING_NAME()
    }

    const today = new Date().toISOString()
    const OUTPUT_PATH = `${today}/`// `${OUTPUT_FOLDER}/${cid}/${uuid}/${today}/`

    const THUMBNAIL_OUTPUT_PATH = OUTPUT_PATH + 'thumbnails/'
    const THUMBNAIL_POSITIONS = [10, 15, 25] //If this array is empty the thumbnail generation will be omitted

    const thumbnailResource = {
      name: `Thumbnail_${uuid}`,
      description: 'Demo thumbnail',
      height: 320,
      unit: 'SECONDS',
      positions: THUMBNAIL_POSITIONS,
      pattern: 'thumbnail-%number%.png'
    }

    let encoding = Object.assign({}, encodingResource)
    let input
    let output
    let H264CodecConfiguration
    let aacCodecConfiguration
    let thumbnail = Object.assign({}, thumbnailResource)

    const getInputConfiguration = this.bitmovin.encoding.inputs
      .gcs(BITMOVIN_GCS_INPUT_KEY)
      .details()

    getInputConfiguration.then((inputConfiguration) => {
      console.log('Successfully got inputConfiguration')
      input = inputConfiguration
    })

    const getOutputConfiguration = this.bitmovin.encoding.outputs
      .gcs(BITMOVIN_GCS_OUTPUT_KEY)
      .details()

    getOutputConfiguration.then((outputConfiguration) => {
      console.log('Successfully got outputConfiguration')
      output = outputConfiguration
    })

    const getH264CodecConfiguration = this.bitmovin.encoding.codecConfigurations
      .h264(BITMOVIN_VIDEO_CODEC_KEY)
      .details()

    getH264CodecConfiguration.then((codec) => {
      console.log('Successfully got H264CodecConfiguration')
      H264CodecConfiguration = codec
    })

    const getAacCodecConfiguration = this.bitmovin.encoding.codecConfigurations
      .aac(BITMOVIN_AUDIO_CODEC_KEY)
      .details()
    getAacCodecConfiguration.then((codec) => {
      console.log('Successfully got aacCodecConfiguration')
      aacCodecConfiguration = codec
    })

    const createEncodingPromise = this.createEncoding(encodingResource)
    createEncodingPromise.then((createdEncoding) => {
      console.log(
        'Successfully created Encoding Resource with name ' +
          encodingResource.name
      )
      encoding = createdEncoding
    })

    const preparationPromises = [
      getInputConfiguration,
      getOutputConfiguration,
      getH264CodecConfiguration,
      getAacCodecConfiguration,
      createEncodingPromise
    ]

    const preparationPromise = await Promise.all(preparationPromises)
    const codecConfigurations = [aacCodecConfiguration, H264CodecConfiguration]

    console.log(
      '----\nSuccessfully created and got input, output, codec configurations and encoding resource.\n----'
    )

    const results = await Promise.all(
      codecConfigurations.map(async (codecConfiguration) => {
        console.log(
          'Adding stream with codecConfig ' +
            codecConfiguration.name +
            ' to encoding...'
        )
        return await this.addStreamToEncoding(
          input,
          output,
          codecConfiguration,
          encoding,
          INPUT_FILE_PATH,
          OUTPUT_PATH
        )
      })
    )

    const [
      [addedAudioStream, addedAudioMuxing],
      [addedVideoStream, addedVideoMuxing]
    ] = results

    addedAudioMuxing.streamId = addedAudioStream.id
    addedVideoMuxing.streamId = addedVideoStream.id

    //console.log('Added audio Muxing', addedAudioMuxing)
    //console.log('Added video Muxing 1080p', addedVideoMuxing)

    const createdHlsManifest = await this.createHlsManifest(
      output,
      encoding,
      [addedAudioMuxing],
      [addedVideoMuxing],
      OUTPUT_PATH
    )

    //console.log('hlsManifestPromise=', createdHlsManifest)

    let thumbnailPromise = Promise.resolve()
    let thumbnailImagePromise = Promise.resolve()

    if (thumbnail.positions.length > 0) {
      thumbnailPromise = await this.createThumbnail(
        output,
        encoding,
        addedVideoStream,
        thumbnail,
        THUMBNAIL_OUTPUT_PATH
      )
    }

    await this.startEncodingAndWaitForItToBeFinished(encoding)
    console.log('Successfully finished encoding')
    await this.startHlsManifestCreation(createdHlsManifest)
    console.log('Successfully created  HLS Manifests')

    thumbnailImagePromise = await this.getThumbnailImage(
      encoding.id,
      addedVideoStream.id,
      thumbnailPromise.id
    )

    return {
      path_to_manifest: `${OUTPUT_PATH}${manifestName}`,
      path_to_thumbnail: `${THUMBNAIL_OUTPUT_PATH}thumbnail-10.png`
    }
  }
}

module.exports = BitmovinService
