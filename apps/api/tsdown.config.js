"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsdown_1 = require("tsdown");
exports.default = (0, tsdown_1.defineConfig)({
    entry: ["src/**/*", "!src/**/*.test.*"],
    format: ["cjs"],
    outExtensions: () => ({
        js: ".cjs"
    })
});
//# sourceMappingURL=tsdown.config.js.map