require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user
  .findMany({
    select: { email: true, username: true, emailVerified: true, elo: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  .then((u) => console.log(JSON.stringify(u, null, 2)))
  .finally(() => p.$disconnect());
