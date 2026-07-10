import axios from 'axios';
import { writeFile } from 'node:fs/promises';

function urlToFileName(url) {
  return url
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .concat('.html');
}
export default async (url, options) => {
  axios.get(url)
    .then(response => writeFile(urlToFileName(url), response.data));
}