import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@sorteouganhou.com" },
    update: {
      name: "Administrador",
      passwordHash,
      role: UserRole.ADMIN,
      active: true
    },
    create: {
      name: "Administrador",
      email: "admin@sorteouganhou.com",
      passwordHash,
      role: UserRole.ADMIN,
      active: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
