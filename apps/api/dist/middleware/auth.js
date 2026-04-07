"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = verifyJWT;
exports.requireCommunityMembership = requireCommunityMembership;
async function verifyJWT(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch {
        reply.code(401).send({ error: 'Unauthorized' });
    }
}
async function requireCommunityMembership(request, reply) {
    const communityId = request.params?.communityId ??
        request.body?.communityId;
    if (!communityId)
        return;
    const isMember = request.user.communityIds.includes(communityId);
    if (!isMember) {
        reply.code(403).send({ error: 'Not a member of this community' });
    }
}
