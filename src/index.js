import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

function download(url, filepath) {
  return axios
    .get(url, { responseType: 'stream' })
    .then(response => response.data.pipe(fs.createWriteStream(filepath)))
}

function formatter(url) {
  const hostname = `${url.hostname}`.replaceAll('.','-')
  let pathname = `${url.pathname}`.replaceAll('/','-')
  pathname = pathname.endsWith('-') ? pathname.slice(0, -1) : pathname
  return `${hostname}${pathname}`
}

export default (url, output) => {
  const pageUrl = new URL(url)
  const name = formatter(pageUrl)
  const dirpath = `${name}_files`
  const promises = []

  return fsp.mkdir(dirpath, { recursive: true })
    .then(() => axios.get(pageUrl.href))
    .then(({ data }) => {
      const $ = cheerio.load(data)

      const tags = {
        "img": "src",
        "link": "href",
        "script": "src",
      }

      for (const [tag, attr] of Object.entries(tags)) {
        $(tag).each((_, res) => {
          const src = $(res).attr(attr)
          if (!src) return

          const resUrl = new URL(src, pageUrl)

          if (pageUrl.hostname === resUrl.hostname) {
            const filepath = path.join(
              dirpath,
              formatter(resUrl),
            )

            promises.push(download(resUrl, filepath))
            $(res).attr(attr, filepath)
          }
        })
      }

      return fsp.writeFile(path.join(output, `${name}.html`), $.html())
    })
    .then(() => Promise.all(promises))
}
