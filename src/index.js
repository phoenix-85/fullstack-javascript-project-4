import axios from 'axios'
import cheerio from 'nock'
import fs from 'node:fs/promises'
import path from 'node:path'

function urlToName(url) {
  return url
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default (url, output) => {
  axios.get(url)
    .then(({ data }) => {
      const name = urlToName(url)
      const $ = cheerio.load(data)
      const imgData = []

      const dirpath = path.join(
        output,
        `${name}_files`,
      )

      $('img').each((_, img) => {
        const src = $(img).attr('src')
        const imgUrl = new URL(url, src)

        const filepath = path.join(
          dirpath,
          urlToName(imgUrl),
        )

        imgData.push([imgUrl, filepath])
        $(img).attr('src', filepath)
      })

      fs.mkdir(dirpath, { recursive: true })
      fs.writeFile(`${name}.html`, $.html())

      return imgData
    })
    .then(imgData => imgData.map((imgSource, filepath) => {
      return axios
        .get(imgSource.href, {responseType: 'stream'})
        .then(response => response.data.pipe(fs.createWriteStream(filepath)))
    }))
    .then(promises => Promise.all(promises))

  // [v] 1. Получаем html по url (axios)
  // [v] 2. Извлекаем ссылки на картинки из html (cheerio)
  // [v] 3. Скачиваем картинки по ссылкам (axios)
  // [ ] 4. Создаем папку по url (mkdir)
  // [ ] 5. Меняем ссылки на картинки в html (cheerio)
  // [ ] 6. Сохраняем файлы (html и картинки) (writeFile)
}
