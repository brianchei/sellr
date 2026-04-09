"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LISTINGS_INDEX = exports.algolia = void 0;
const algoliasearch_1 = require("algoliasearch");
exports.algolia = process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_API_KEY
    ? (0, algoliasearch_1.algoliasearch)(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY)
    : null;
exports.LISTINGS_INDEX = `${process.env.NODE_ENV === 'production' ? 'prod' : 'staging'}_listings`;
