import { PrismaClient } from '@prisma/client';
import * as argon from 'argon2';

const prisma = new PrismaClient();

async function main() {
  await prisma.admin.upsert({
    where: { email: process.env.SEED_EMAIL },
    update: {},
    create: <any>{
      first_name: process.env.SEED_FIRST_NAME,
      last_name: process.env.SEED_LAST_NAME,
      email: process.env.SEED_EMAIL,
      password: await argon.hash(process.env.SEED_PASSWORD),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
