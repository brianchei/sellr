"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.paginated = paginated;
function ok(data, meta) {
    return { data, meta };
}
function paginated(data, page, total, perPage) {
    return {
        data,
        meta: { page, total, perPage, totalPages: Math.ceil(total / perPage) },
    };
}
