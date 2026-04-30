"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = verifyJWT;
exports.requireCommunityMembership = requireCommunityMembership;
const authCookies_1 = require("../lib/authCookies");
function bearerToken(request) {
    const h = request.headers.authorization;
    if (typeof h === 'string' && h.startsWith('Bearer ')) {
        return h.slice(7);
    }
    return undefined;
}
function accessTokenFromCookie(request) {
    const raw = request.cookies[authCookies_1.SELLR_ACCESS_COOKIE];
    return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}
async function verifyJWT(request, reply) {
    const token = bearerToken(request) ?? accessTokenFromCookie(request);
    if (!token) {
        return reply.code(401).send({ error: 'Unauthorized' });
    }
    try {
        const payload = request.server.jwt.verify(token);
        request.user = payload;
    }
    catch {
        return reply.code(401).send({ error: 'Unauthorized' });
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
