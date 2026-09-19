// True only for mongodb:// URIs whose every host is this machine. mongodb+srv:// is always a
// remote cluster (Atlas). Used to stop destructive scripts from touching real data by accident.
export function isLocalDatabase(uri = ''): boolean {
  const match = /^mongodb:\/\/(?:[^@/]*@)?([^/?]+)/.exec(uri);
  if (!match) return false;
  return match[1]!
    .split(',')
    .every((host) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host));
}
