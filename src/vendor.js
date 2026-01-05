// This file is supposed to import all needed external libraries
// and intended to be "built" using a bundler e.g. esbuild.

import sanitize from "sanitize-filename";

export const vendor = {
    sanitize: sanitize,
};
