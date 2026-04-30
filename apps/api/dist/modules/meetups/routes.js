"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetupRoutes = void 0;
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const plugin = (fastify, _opts, done) => {
    fastify.get('/:meetupId', { preHandler: auth_1.verifyJWT }, async (request, reply) => {
        const { meetupId } = request.params;
        const meetup = await prisma_1.prisma.meetup.findUnique({
            where: { id: meetupId },
            include: { offer: { include: { listing: true } } },
        });
        if (!meetup) {
            return reply.code(404).send({ error: 'Meetup not found' });
        }
        if (meetup.offer.buyerId !== request.user.sub &&
            meetup.offer.sellerId !== request.user.sub) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        if (!request.user.communityIds.includes(meetup.offer.listing.communityId)) {
            return reply
                .code(403)
                .send({ error: 'Not a member of this community' });
        }
        return reply.send((0, response_1.ok)({ meetup }));
    });
    done();
};
exports.meetupRoutes = plugin;
