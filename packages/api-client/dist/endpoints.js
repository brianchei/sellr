"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtp = sendOtp;
exports.verifyOtp = verifyOtp;
exports.refreshTokens = refreshTokens;
exports.fetchMe = fetchMe;
exports.registerPushToken = registerPushToken;
exports.joinCommunity = joinCommunity;
exports.fetchListingsNearby = fetchListingsNearby;
exports.fetchCommunityListings = fetchCommunityListings;
exports.createListing = createListing;
exports.fetchListing = fetchListing;
exports.publishListing = publishListing;
exports.searchListings = searchListings;
exports.createOffer = createOffer;
exports.fetchOffer = fetchOffer;
exports.respondToOffer = respondToOffer;
exports.fetchMeetup = fetchMeetup;
exports.createConversation = createConversation;
exports.fetchConversationMessages = fetchConversationMessages;
exports.sendMessage = sendMessage;
exports.fetchNotifications = fetchNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.createReport = createReport;
const fetch_1 = require("./fetch");
function sendOtp(phoneE164) {
    return (0, fetch_1.apiFetch)('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phoneE164 }),
    });
}
function verifyOtp(body) {
    return (0, fetch_1.apiFetch)('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
function refreshTokens(refreshToken) {
    return (0, fetch_1.apiFetch)('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
    });
}
function fetchMe() {
    return (0, fetch_1.apiFetch)('/auth/me');
}
function registerPushToken(expoPushToken) {
    return (0, fetch_1.apiFetch)('/auth/push-token', {
        method: 'POST',
        body: JSON.stringify({ expoPushToken }),
    });
}
function joinCommunity(body) {
    return (0, fetch_1.apiFetch)('/communities/join', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
function fetchListingsNearby(params) {
    const q = new URLSearchParams({
        communityId: params.communityId,
        lat: String(params.lat),
        lng: String(params.lng),
    });
    if (params.radiusM != null) {
        q.set('radiusM', String(params.radiusM));
    }
    return (0, fetch_1.apiFetch)(`/listings/nearby?${q.toString()}`);
}
function fetchCommunityListings(params) {
    const q = new URLSearchParams({ communityId: params.communityId });
    if (params.limit != null) {
        q.set('limit', String(params.limit));
    }
    return (0, fetch_1.apiFetch)(`/listings?${q.toString()}`);
}
function createListing(body) {
    return (0, fetch_1.apiFetch)('/listings', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
function fetchListing(listingId) {
    return (0, fetch_1.apiFetch)(`/listings/${listingId}`);
}
function publishListing(listingId) {
    return (0, fetch_1.apiFetch)(`/listings/${listingId}/publish`, {
        method: 'POST',
    });
}
function searchListings(params) {
    const q = new URLSearchParams({
        communityId: params.communityId,
        q: params.q ?? '',
    });
    if (params.page != null)
        q.set('page', String(params.page));
    if (params.hitsPerPage != null) {
        q.set('hitsPerPage', String(params.hitsPerPage));
    }
    if (params.lat != null)
        q.set('lat', String(params.lat));
    if (params.lng != null)
        q.set('lng', String(params.lng));
    return (0, fetch_1.apiFetch)(`/search/listings?${q.toString()}`);
}
function createOffer(body) {
    return (0, fetch_1.apiFetch)('/offers', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
function fetchOffer(offerId) {
    return (0, fetch_1.apiFetch)(`/offers/${offerId}`);
}
function respondToOffer(offerId, body) {
    return (0, fetch_1.apiFetch)(`/offers/${offerId}/respond`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
function fetchMeetup(meetupId) {
    return (0, fetch_1.apiFetch)(`/meetups/${meetupId}`);
}
function createConversation(body) {
    return (0, fetch_1.apiFetch)('/conversations', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
function fetchConversationMessages(conversationId) {
    return (0, fetch_1.apiFetch)(`/conversations/${conversationId}/messages`);
}
function sendMessage(conversationId, body) {
    return (0, fetch_1.apiFetch)(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
function fetchNotifications(params) {
    const q = new URLSearchParams();
    if (params?.limit != null)
        q.set('limit', String(params.limit));
    if (params?.unreadOnly != null) {
        q.set('unreadOnly', String(params.unreadOnly));
    }
    const qs = q.toString();
    return (0, fetch_1.apiFetch)(`/notifications${qs ? `?${qs}` : ''}`);
}
function markNotificationRead(notificationId) {
    return (0, fetch_1.apiFetch)(`/notifications/${notificationId}/read`, { method: 'POST' });
}
function markAllNotificationsRead() {
    return (0, fetch_1.apiFetch)('/notifications/read-all', {
        method: 'POST',
    });
}
function createReport(body) {
    return (0, fetch_1.apiFetch)('/reports', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
