import {z} from 'zod';
import bundledCatalog from '../../references/design-catalog.json';

const CatalogSchema=z.object({
  version:z.literal(1),
  designs:z.array(z.object({
    id:z.string().regex(/^R[0-9]{2,6}$/),
    name:z.string().trim().min(1).max(100),
    bestFor:z.string().trim().min(1).max(320),
    motion:z.string().trim().min(1).max(320),
    pace:z.string().trim().min(1).max(320),
    constraints:z.string().trim().min(1).max(320),
    detail:z.string().regex(/^references\/[a-z0-9-]+\.md(?:#r[0-9]{2,6})?$/),
  }).strict()).min(1),
}).strict();

const {designs}=CatalogSchema.parse(bundledCatalog);
const ids=designs.map(design=>design.id);
if(new Set(ids).size!==ids.length) throw new Error('Design catalog IDs must be unique');

export const DesignRefSchema=z.enum(ids as [string,...string[]]);
export const designCatalog=designs;
export const defaultDesignRef=ids.includes('R08')?'R08':ids[0];
