import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'node:fs/promises'
import path from 'node:path'

function urlToName(url) {
  return url
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default (url, output) => {
  let html
  const imgData = []
  const name = urlToName(url)

  return axios.get(url)
    .then(({ data }) => {
      const $ = cheerio.load(data)

      const dirpath = path.join(
        output,
        `${name}_files`,
      )

      $('img').each((_, img) => {
        const src = $(img).attr('src')
        const imgUrl = new URL(src, url)

        const filepath = path.join(
          dirpath,
          urlToName(imgUrl),
        )

        imgData.push([imgUrl, filepath])
        $(img).attr('src', filepath)
      })

      html = $.html()

      return fs.mkdir(dirpath, { recursive: true })
    })
    .then(() => fs.writeFile(path.join(output, `${name}.html`), html))
    .then(() => imgData.map(([imgSource, filepath]) => {
      return axios
        .get(imgSource.href, {responseType: 'stream'})
        .then(response => response.data.pipe(fs.createWriteStream(filepath)))
    }))
    .then(promises => Promise.all(promises))
}
