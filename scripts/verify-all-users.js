/** One-time dev helper: mark all users as email-verified. */
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user
  .updateMany({
    where: { email: { not: 'open-seat@system.local' } },
    data: {
      emailVerified: true,
      emailVerifyTokenHash: null,
      emailVerifyExpiresAt: null,
    },
  })
  .then((r) => {
    console.log(`Marked ${r.count} user(s) as email verified.`);
  })
  .finally(() => p.$disconnect());
