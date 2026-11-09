// Pure helpers behind scripts/migrate.mjs: which files in db/migrations are migrations, the order
// they apply in, and whether a database URL is safe to touch. No imports and only erasable type
// syntax, so the script can load this file directly through Node's type stripping.

const UP_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;
const DOWN_FILE = /^\d{4}_[a-z0-9_]+\.down\.sql$/;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function downFileFor(upFile: string): string {
  return upFile.replace(/\.sql$/, ".down.sql");
}

/** Up files in apply order. Throws on a stray file name, or an up file without its down file. */
export function orderMigrations(files: readonly string[]): string[] {
  const present = new Set(files);
  const ups: string[] = [];
  for (const file of files) {
    if (UP_FILE.test(file)) {
      if (!present.has(downFileFor(file))) {
        throw new Error(`${file} has no ${downFileFor(file)}: every migration must be reversible`);
      }
      ups.push(file);
    } else if (DOWN_FILE.test(file)) {
      if (!present.has(file.replace(/\.down\.sql$/, ".sql"))) {
        throw new Error(`${file} has no up migration`);
      }
    } else {
      throw new Error(`${file} is not named NNNN_name.sql or NNNN_name.down.sql`);
    }
  }
  return ups.sort();
}

export function pendingMigrations(ordered: readonly string[], applied: ReadonlySet<string>) {
  return ordered.filter((name) => !applied.has(name));
}

export function isLocalDatabase(url: string): boolean {
  return LOCAL_HOSTS.has(new URL(url).hostname);
}
