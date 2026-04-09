import { algoliasearch, type Algoliasearch } from 'algoliasearch';

export const algolia: Algoliasearch | null =
  process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_API_KEY
    ? algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY)
    : null;

export const LISTINGS_INDEX = `${
  process.env.NODE_ENV === 'production' ? 'prod' : 'staging'
}_listings`;
