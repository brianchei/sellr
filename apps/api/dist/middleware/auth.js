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
function requireCommunityMembership(request, reply) {
    const body = request.body;
    const communityId = request.params.communityId ?? body.communityId;
    if (!communityId)
        return;
    const isMember = request.user.communityIds.includes(communityId);
    if (!isMember) {
        reply.code(403).send({ error: 'Not a member of this community' });
    }
}
