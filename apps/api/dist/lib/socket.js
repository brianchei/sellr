"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketIO = initSocketIO;
exports.emitToUsers = emitToUsers;
const logger_1 = require("./logger");
let ioInstance = null;
function userRoom(userId) {
    return `user:${userId}`;
}
function initSocketIO(io, jwtVerifier) {
    ioInstance = io;
    io.use((socket, next) => {
        const auth = socket.handshake.auth;
        const tokenRaw = auth?.token;
        const token = typeof tokenRaw === 'string' ? tokenRaw : undefined;
        if (!token) {
            next(new Error('Unauthorized: missing realtime token'));
            return;
        }
        try {
            const payload = jwtVerifier.jwt.verify(token);
            if (!payload.sub) {
                next(new Error('Unauthorized: invalid token payload'));
                return;
            }
            const data = {
                userId: payload.sub,
                communityIds: payload.communityIds,
            };
            socket.data = data;
            next();
        }
        catch {
            next(new Error('Unauthorized: invalid realtime token'));
        }
    });
    io.on('connection', (socket) => {
        const data = socket.data;
        if (!data?.userId) {
            socket.disconnect(true);
            return;
        }
        void socket.join(userRoom(data.userId));
    });
}
function emitToUsers(userIds, event, payload) {
    if (!ioInstance || userIds.length === 0)
        return;
    const rooms = userIds.map(userRoom);
    try {
        ioInstance.to(rooms).emit(event, payload);
    }
    catch (err) {
        logger_1.logger.error({ err, event }, 'Failed to emit realtime event');
    }
}
