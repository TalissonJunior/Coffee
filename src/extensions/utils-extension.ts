import { GluegunToolbox } from 'gluegun'
import * as fs from 'fs'
import * as https from 'https'
import { IncomingMessage } from 'http'

module.exports = (toolbox: GluegunToolbox) => {
  const {} = toolbox

  toolbox.utils = {
    downloadFileToDisk,
    capitalize
  }

  // Get file  from external url and save it to disk, from external url
  function downloadFileToDisk(
    url: string,
    localPath: string
  ): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      https.get(url, response => {
        if (response.statusCode === 200) {
          const b = fs.createWriteStream(localPath)

          b.on('close', () => {
            resolve(response)
          })

          response.pipe(b)
        } else {
          reject(response)
        }
      })
    })
  }

  function capitalize(s: string) {
    return s[0].toUpperCase() + s.slice(1)
  }
}
