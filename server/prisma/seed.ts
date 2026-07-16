import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.$executeRaw`SELECT 1`;
  console.info("Database seed completed. No application seed data is defined yet.");
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

