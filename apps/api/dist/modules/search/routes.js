"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRoutes = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const shared_1 = require("@sellr/shared");
const algolia_1 = require("../../lib/algolia");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const plugin = (fastify, _opts, done) => {
    fastify.get('/listings', {
        preHandler: auth_1.verifyJWT,
        schema: {
            querystring: shared_1.SearchListingsQuerySchema,
        },
    }, async (request, reply) => {
        const { communityId, q, page, hitsPerPage, lat, lng } = shared_1.SearchListingsQuerySchema.parse(request.query);
        if (!request.user.communityIds.includes(communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        if (!algolia_1.algolia) {
            return reply.code(503).send({ error: 'Search is not configured' });
        }
        const filters = `communityId:"${communityId}" AND status:active`;
        const res = await algolia_1.algolia.searchSingleIndex({
            indexName: algolia_1.LISTINGS_INDEX,
            searchParams: {
                query: q,
                page,
                hitsPerPage,
                filters,
                ...(lat !== undefined && lng !== undefined
                    ? { aroundLatLng: `${String(lat)},${String(lng)}` }
                    : {}),
            },
        });
        return reply.send((0, response_1.ok)({
            hits: res.hits,
            page: res.page,
            nbHits: res.nbHits,
            nbPages: res.nbPages,
            queryID: res.queryID,
        }));
    });
    done();
};
exports.searchRoutes = (0, fastify_plugin_1.default)(plugin);
