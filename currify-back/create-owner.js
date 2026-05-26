const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL || 'osielnet@gmail.com';
  const password = process.env.OWNER_PASSWORD || 'SuperAdmin2026!'; // Contraseña temporal, cambiar al ingresar.
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // 1. Seed plans config if empty
    const plansCount = await prisma.planConfig.count();
    if (plansCount === 0) {
      console.log('Sembrando planes por defecto en la base de datos...');
      const defaultPlans = [
        {
          tier: 'FREE',
          name: 'Starter',
          description: 'Ideal para probar la magia.',
          price: 0,
          campaignLimit: 1,
          cvCredits: 3,
          smartFillCredits: 3,
          features: [
            '1 Campaña activa',
            '3 CVs por mes',
            'Extracción básica de datos',
            'Análisis de candidatos'
          ]
        },
        {
          tier: 'PRO',
          name: 'EvalenPro',
          description: 'Para equipos de RR.HH. que buscan escalar.',
          price: 19990,
          campaignLimit: 999,
          cvCredits: 999,
          smartFillCredits: 999,
          features: [
            'Campañas ilimitadas',
            'Procesamiento ilimitado de CVs',
            'Smart Match avanzado',
            'Exportación de reportes',
            'Soporte prioritario'
          ]
        },
        {
          tier: 'ENTERPRISE',
          name: 'Enterprise',
          description: 'Para grandes corporativos.',
          price: -1,
          campaignLimit: 9999,
          cvCredits: 9999,
          smartFillCredits: 9999,
          features: [
            'Todo lo de EvalenPro',
            'SSO corporativo',
            'API de integración',
            'Onboarding personalizado',
            'SLA garantizado'
          ]
        }
      ];

      for (const p of defaultPlans) {
        await prisma.planConfig.create({
          data: p
        });
      }
      console.log('¡Planes sembrados con éxito!');
    }

    // 2. Configure Super Admin
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
    console.error('Error al configurar el entorno local:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
