import fs from "fs/promises";
import path from "path";

const packageDir = path.resolve(process.cwd());
const packagePath = path.join(packageDir, "package.json");
const srcDir = path.join(packageDir, "src");

const indexFileNames = [
  "index.ts",
  "index.tsx",
  "index.mts",
  "index.cts",
  "index.js",
  "index.jsx",
];

const entryFileNames = ["index.ts", "index.tsx", "index.mts", "index.cts", "index.js", "index.jsx"];

const isEntryDir = async (dirPath) => {
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) return false;
  } catch {
    return false;
  }

  for (const fileName of entryFileNames) {
    const candidate = path.join(dirPath, fileName);
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return true;
    } catch {
      continue;
    }
  }

  return false;
};

const rootHasIndex = async () => {
  for (const fileName of indexFileNames) {
    const candidate = path.join(srcDir, fileName);
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return true;
    } catch {
      continue;
    }
  }
  return false;
};

const buildExports = async () => {
  const entries = {};
  const items = await fs.readdir(srcDir, { withFileTypes: true });

  if (await rootHasIndex()) {
    entries["."] = {
      import: {
        types: "./dist/es/index.d.mts",
        default: "./dist/es/index.mjs",
      },
      require: {
        types: "./dist/cjs/index.d.ts",
        default: "./dist/cjs/index.js",
      },
    };
  }

  for (const item of items) {
    if (!item.isDirectory()) continue;
    if (item.name.startsWith(".")) continue;
    if (!(await isEntryDir(path.join(srcDir, item.name)))) continue;

    entries[`./${item.name}`] = {
      import: {
        types: `./dist/es/${item.name}.d.mts`,
        default: `./dist/es/${item.name}.mjs`,
      },
      require: {
        types: `./dist/cjs/${item.name}.d.ts`,
        default: `./dist/cjs/${item.name}.js`,
      },
    };
  }

  return entries;
};

const run = async () => {
  const packageJsonText = await fs.readFile(packagePath, "utf8");
  const packageJson = JSON.parse(packageJsonText);

  const newExports = await buildExports();
  const existingExports = packageJson.exports ?? {};

  const exportsChanged = JSON.stringify(existingExports, null, 2) !== JSON.stringify(newExports, null, 2);
  if (!exportsChanged) {
    console.log("package.json exports already up to date.");
    return;
  }

  packageJson.exports = newExports;
  await fs.writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  console.log("Updated package.json exports from src/* entries.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
