import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const dist = resolve('dist');
mkdirSync(dist + '/.openai', {recursive:true});
cpSync('src', dist + '/server', {recursive:true});
cpSync('.openai/hosting.json', dist + '/.openai/hosting.json');
console.log('ItaliaOS Worker built.');
