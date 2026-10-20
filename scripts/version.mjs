import { writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const sha = process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('GITHUB_SHA must be a full commit SHA');
writeFileSync('dist/version.json', JSON.stringify({sha})+'\n');
function files(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? files(join(dir,e.name)) : [join(dir,e.name)]); }
writeFileSync('dist/SHA256SUMS',files('dist').filter(p => !p.endsWith('/SHA256SUMS')).sort().map(p => `${createHash('sha256').update(readFileSync(p)).digest('hex')}  ${p.slice(5)}`).join('\n')+'\n');
