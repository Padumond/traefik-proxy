const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedPackages() {
  try {
    console.log('🌱 Seeding SMS packages...');

    // Create sample SMS packages
    const packages = [
      {
        name: 'Starter Pack',
        description: 'Perfect for small businesses and personal use',
        credits: 100,
        price: 10.00,
        currency: 'GHS',
        isPopular: false,
      },
      {
        name: 'Business Pack',
        description: 'Ideal for growing businesses and marketing campaigns',
        credits: 500,
        price: 45.00,
        currency: 'GHS',
        isPopular: true,
      },
      {
        name: 'Professional Pack',
        description: 'For high-volume messaging and enterprise needs',
        credits: 1000,
        price: 85.00,
        currency: 'GHS',
        isPopular: false,
      },
      {
        name: 'Enterprise Pack',
        description: 'Maximum value for large-scale operations',
        credits: 2500,
        price: 200.00,
        currency: 'GHS',
        isPopular: false,
      },
    ];

    // Delete existing packages
    await prisma.smsPackage.deleteMany();
    console.log('🗑️  Cleared existing packages');

    // Create new packages
    for (const packageData of packages) {
      const createdPackage = await prisma.smsPackage.create({
        data: packageData,
      });
      console.log(`✅ Created package: ${createdPackage.name} (${createdPackage.credits} credits for GH₵${createdPackage.price})`);
    }

    console.log('🎉 SMS packages seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding packages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPackages();
