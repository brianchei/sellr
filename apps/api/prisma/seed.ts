import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadDatabaseEnv } from '../src/lib/loadDatabaseEnv';

loadDatabaseEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const demoPhotos = {
  desk: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80',
  bike: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80',
  lamp: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
  chair:
    'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80',
};

type DemoListingInput = {
  sellerId: string;
  communityId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  condition: 'like_new' | 'good' | 'fair' | 'for_parts';
  conditionNote?: string;
  price: string;
  negotiable: boolean;
  status: 'draft' | 'active' | 'sold' | 'expired';
  locationNeighborhood: string;
  locationRadiusM: number;
  photoUrl: string;
};

async function upsertDemoUser({
  phoneE164,
  displayName,
}: {
  phoneE164: string;
  displayName: string;
}) {
  return prisma.user.upsert({
    where: { phoneE164 },
    create: {
      phoneE164,
      displayName,
      verifiedAt: new Date(),
    },
    update: {
      displayName,
      verifiedAt: new Date(),
    },
  });
}

async function ensureMembership(
  userId: string,
  communityId: string,
  role: 'member' | 'admin' = 'member',
) {
  await prisma.communityMember.upsert({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
    create: {
      userId,
      communityId,
      role,
      status: 'active',
    },
    update: {
      role,
      status: 'active',
    },
  });
}

async function resetDemoCommunityData({
  communityId,
  userIds,
}: {
  communityId: string;
  userIds: string[];
}) {
  const listings = await prisma.listing.findMany({
    where: { communityId },
    select: { id: true },
  });
  const listingIds = listings.map((listing) => listing.id);

  const offers = await prisma.offer.findMany({
    where: { listingId: { in: listingIds } },
    select: { id: true },
  });
  const offerIds = offers.map((offer) => offer.id);

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { listingId: { in: listingIds } },
        { offerId: { in: offerIds } },
      ],
    },
    select: { id: true },
  });
  const conversationIds = conversations.map((conversation) => conversation.id);

  const messages = await prisma.message.findMany({
    where: { conversationId: { in: conversationIds } },
    select: { id: true },
  });
  const messageIds = messages.map((message) => message.id);

  const meetups = await prisma.meetup.findMany({
    where: { offerId: { in: offerIds } },
    select: { id: true },
  });
  const meetupIds = meetups.map((meetup) => meetup.id);

  await prisma.notification.deleteMany({
    where: { userId: { in: userIds } },
  });

  await prisma.report.deleteMany({
    where: {
      OR: [
        { reporterId: { in: userIds } },
        { targetType: 'user', targetId: { in: userIds } },
        { targetType: 'listing', targetId: { in: listingIds } },
        { targetType: 'message', targetId: { in: messageIds } },
      ],
    },
  });

  await prisma.rating.deleteMany({
    where: { meetupId: { in: meetupIds } },
  });
  await prisma.message.deleteMany({
    where: { conversationId: { in: conversationIds } },
  });
  await prisma.conversation.deleteMany({
    where: { id: { in: conversationIds } },
  });
  await prisma.meetup.deleteMany({
    where: { id: { in: meetupIds } },
  });
  await prisma.offer.deleteMany({
    where: { id: { in: offerIds } },
  });
  await prisma.listing.deleteMany({
    where: { id: { in: listingIds } },
  });
}

async function upsertDemoListing(input: DemoListingInput) {
  const existing = await prisma.listing.findFirst({
    where: {
      sellerId: input.sellerId,
      communityId: input.communityId,
      title: input.title,
    },
  });

  const data = {
    communityId: input.communityId,
    sellerId: input.sellerId,
    title: input.title,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    condition: input.condition,
    conditionNote: input.conditionNote ?? null,
    price: input.price,
    negotiable: input.negotiable,
    status: input.status,
    locationNeighborhood: input.locationNeighborhood,
    locationRadiusM: input.locationRadiusM,
    availabilityWindows: [{ dayOfWeek: 6, startHour: 10, endHour: 14 }],
    photoUrls: [input.photoUrl],
    aiGenerated: false,
  };

  if (existing) {
    return prisma.listing.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.listing.create({ data });
}

async function ensureDemoConversation({
  buyerId,
  sellerId,
  listingId,
}: {
  buyerId: string;
  sellerId: string;
  listingId: string;
}) {
  let conversation = await prisma.conversation.findFirst({
    where: {
      listingId,
      type: 'pre_offer',
      AND: [
        { participantIds: { has: buyerId } },
        { participantIds: { has: sellerId } },
      ],
    },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        listingId,
        participantIds: [buyerId, sellerId],
        type: 'pre_offer',
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  if (conversation._count.messages === 0) {
    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: buyerId,
          content:
            'Hi, is the walnut study desk still available? I can pick up locally this weekend.',
        },
        {
          conversationId: conversation.id,
          senderId: sellerId,
          content:
            'Yes, it is still available. Saturday afternoon works well for pickup.',
        },
      ],
    });
  }
}

async function main() {
  const seedUser = await prisma.user.upsert({
    where: { phoneE164: '+10000000001' },
    create: {
      phoneE164: '+10000000001',
      displayName: 'Seed',
    },
    update: {},
  });

  const demoSeller = await upsertDemoUser({
    phoneE164: '+15550000001',
    displayName: 'Maya Chen',
  });
  const demoBuyer = await upsertDemoUser({
    phoneE164: '+15550000002',
    displayName: 'Jordan Rivera',
  });
  const demoAdmin = await upsertDemoUser({
    phoneE164: '+15550000003',
    displayName: 'Priya Shah',
  });

  let community = await prisma.community.findFirst({
    where: { name: 'Dev Campus' },
  });
  if (!community) {
    community = await prisma.community.create({
      data: {
        name: 'Dev Campus',
        type: 'campus',
        accessMethod: 'invite_code',
        rules: [],
      },
    });
  }

  await prisma.inviteCode.upsert({
    where: { code: 'DEV2026' },
    create: {
      communityId: community.id,
      code: 'DEV2026',
      maxUses: 1000,
      createdBy: seedUser.id,
    },
    update: {},
  });

  await Promise.all([
    ensureMembership(seedUser.id, community.id),
    ensureMembership(demoSeller.id, community.id),
    ensureMembership(demoBuyer.id, community.id),
    ensureMembership(demoAdmin.id, community.id, 'admin'),
  ]);

  await resetDemoCommunityData({
    communityId: community.id,
    userIds: [seedUser.id, demoSeller.id, demoBuyer.id, demoAdmin.id],
  });

  const desk = await upsertDemoListing({
    sellerId: demoSeller.id,
    communityId: community.id,
    title: 'Walnut study desk',
    description:
      'Compact desk in good condition with a few light marks on the top. Great for a dorm or apartment workspace.',
    category: 'Furniture',
    subcategory: 'Desk',
    condition: 'good',
    conditionNote: 'Light marks on desktop',
    price: '45.00',
    negotiable: true,
    status: 'active',
    locationNeighborhood: 'North Campus',
    locationRadiusM: 1000,
    photoUrl: demoPhotos.desk,
  });

  await Promise.all([
    upsertDemoListing({
      sellerId: demoSeller.id,
      communityId: community.id,
      title: 'Campus cruiser bike',
      description:
        'Single-speed bike with a fresh chain and working brakes. Good for getting around campus.',
      category: 'Transportation',
      subcategory: 'Bike',
      condition: 'good',
      conditionNote: 'Minor paint scuffs',
      price: '120.00',
      negotiable: true,
      status: 'active',
      locationNeighborhood: 'East Quad',
      locationRadiusM: 1500,
      photoUrl: demoPhotos.bike,
    }),
    upsertDemoListing({
      sellerId: demoSeller.id,
      communityId: community.id,
      title: 'Brass desk lamp',
      description:
        'Warm brass lamp with a simple shade. Works well for a bedside table or study nook.',
      category: 'Home',
      subcategory: 'Lighting',
      condition: 'like_new',
      conditionNote: 'Tested and working',
      price: '28.00',
      negotiable: false,
      status: 'draft',
      locationNeighborhood: 'West Loop',
      locationRadiusM: 1000,
      photoUrl: demoPhotos.lamp,
    }),
    upsertDemoListing({
      sellerId: demoSeller.id,
      communityId: community.id,
      title: 'Sold reading chair',
      description:
        'Comfortable accent chair kept in the demo data to show the sold listing lifecycle.',
      category: 'Furniture',
      subcategory: 'Chair',
      condition: 'fair',
      conditionNote: 'Already picked up by a local buyer',
      price: '36.00',
      negotiable: true,
      status: 'sold',
      locationNeighborhood: 'South Hall',
      locationRadiusM: 1000,
      photoUrl: demoPhotos.chair,
    }),
  ]);

  await ensureDemoConversation({
    buyerId: demoBuyer.id,
    sellerId: demoSeller.id,
    listingId: desk.id,
  });

  await prisma.report.create({
    data: {
      reporterId: demoBuyer.id,
      targetId: desk.id,
      targetType: 'listing',
      reason:
        'Demo report: please confirm the pickup details follow community safety guidelines.',
      severity: 'quality',
      status: 'open',
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
