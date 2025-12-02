const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      console.log('Test user already exists:', existingUser.email);
      return existingUser;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 12);
    
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'CLIENT',
        walletBalance: 100.00,
        isEmailVerified: true
      }
    });

    console.log('Test user created:', user.email);
    return user;
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
