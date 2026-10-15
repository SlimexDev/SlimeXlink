import 'server-only';
import { parseAdminEnv } from './schema';

export function getAdminConfig() { return parseAdminEnv(process.env); }
