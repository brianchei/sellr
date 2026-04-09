/**
 * One-time index setup. Run: pnpm --filter @sellr/api algolia:configure
 * Requires ALGOLIA_APP_ID and ALGOLIA_API_KEY (admin).
 */
import { algoliasearch } from 'algoliasearch';
import { LISTINGS_INDEX } from '../lib/algolia';

function getClient() {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_API_KEY;
  if (!appId || !apiKey) {
    console.error('Missing ALGOLIA_APP_ID or ALGOLIA_API_KEY');
    process.exit(1);
  }
  return algoliasearch(appId, apiKey);
}

async function configure(): Promise<void> {
  const client = getClient();

  await client.setSettings({
    indexName: LISTINGS_INDEX,
    indexSettings: {
      searchableAttributes: [
        'title',
        'description',
        'category,subcategory',
        'locationNeighborhood',
      ],
      attributesForFaceting: [
        'filterOnly(communityId)',
        'filterOnly(status)',
        'category',
        'condition',
        'filterOnly(sellerId)',
      ],
      ranking: [
        'geo',
        'typo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom',
      ],
      customRanking: ['desc(createdAtTimestamp)'],
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
    },
  });

  await client.saveSynonyms({
    indexName: LISTINGS_INDEX,
    replaceExistingSynonyms: true,
    synonymHit: [
      {
        objectID: 'sofa-synonyms',
        type: 'synonym',
        synonyms: ['sofa', 'couch', 'loveseat', 'sectional'],
      },
      {
        objectID: 'fridge-synonyms',
        type: 'synonym',
        synonyms: ['fridge', 'refrigerator'],
      },
      {
        objectID: 'laptop-synonyms',
        type: 'synonym',
        synonyms: ['laptop', 'notebook', 'macbook', 'chromebook'],
      },
    ],
  });

  console.log('Algolia index configured:', LISTINGS_INDEX);
}

configure().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
