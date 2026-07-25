import axios from 'axios'
import * as cheerio from 'cheerio'
import Listr from 'listr'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

function download(url, filepath) {
  return axios
    .get(url, {responseType: 'stream'})
    .then(response => new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath)
      response.data.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
    }))
}

function formatter(url) {
  const hostname = `${url.hostname}`.replaceAll('.','-')
  const pathname = `${url.pathname}`
    .replaceAll('/','-')
    .replace(/^-+|-+$/g, '')
  return `${hostname}-${pathname}`
}

export default (url, output) => {
  const pageUrl = new URL(url)
  const name = formatter(pageUrl)
  const dirname = `${name}_files`
  const dirpath = path.join(output, dirname)
  const tasks = []

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
        $(`${tag}[${attr}]`).each((_, res) => {
          const src = $(res).attr(attr)
          const resUrl = new URL(src, pageUrl)

          if (pageUrl.hostname === resUrl.hostname) {
            const filename = `${formatter(resUrl)}${$(res).attr('rel') === 'canonical' ? '.html' : ''}`
            const filepath = path.join(dirpath, filename)

            tasks.push({
              title: resUrl.href,
              task: () => download(resUrl.href, filepath),
            })

            $(res).attr(attr, path.join(dirname, filename))
          }
        })
      }

      return fsp.writeFile(path.join(output, `${name}.html`), $.html())
    })
    .then(() => new Listr(tasks, { concurrent: true, exitOnError: true }).run())
}
