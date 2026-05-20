const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'osielnet@gmail.com';
  const password = 'SuperAdmin2026!'; // Contraseña temporal, cambiar al ingresar.
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'OWNER',
      },
      create: {
        email,
        password: hashedPassword,
        name: 'Super Admin',
        company: 'Currify Owner',
        role: 'OWNER',
        isActive: true,
      },
    });
    console.log(`\n======================================================`);
    console.log(`¡Éxito! El usuario ${user.email} ahora tiene el rol: ${user.role}`);
    console.log(`======================================================`);
    if (user.password === hashedPassword) {
      console.log(`El usuario era nuevo y se ha creado.`);
      console.log(`Contraseña temporal: ${password}`);
      console.log(`¡Recuerda cambiar tu contraseña al iniciar sesión!`);
    } else {
      console.log(`El usuario ya existía y ha sido promovido a OWNER.`);
    }
    console.log(`======================================================\n`);
  } catch (error) {
    console.error('Error al configurar el Super Admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
