// Writes docs/openapi.json — import it into Postman (Import → File) for a ready-made collection.
import { writeFile } from 'node:fs/promises';
import { openapiSpec } from '../docs/openapi.js';

const target = new URL('../../../../docs/openapi.json', import.meta.url);
await writeFile(target, `${JSON.stringify(openapiSpec, null, 2)}\n`);
console.log('Wrote docs/openapi.json');
