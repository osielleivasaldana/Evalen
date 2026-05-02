const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const freeUsers = await prisma.user.updateMany({
    where: { plan: { not: 'PRO' } },
    data: { smartFillCredits: 3 }
  });
  
  const proUsers = await prisma.user.updateMany({
    where: { plan: 'PRO' },
    data: { smartFillCredits: 50 }
  });

  console.log('Usuarios Free/Básicos actualizados a 3 créditos:', freeUsers.count);
  console.log('Usuarios PRO actualizados a 50 créditos:', proUsers.count);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
