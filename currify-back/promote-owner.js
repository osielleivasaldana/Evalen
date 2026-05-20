const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Por favor, proporciona el email del usuario. Ejemplo: node promote-owner.js usuario@ejemplo.com');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'OWNER' }
    });
    console.log(`¡Éxito! El usuario ${user.email} ahora tiene el rol: ${user.role}`);
  } catch (error) {
    console.error('Error al promover al usuario:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
