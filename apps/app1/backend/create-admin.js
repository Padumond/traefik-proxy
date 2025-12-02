const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log("🔧 Creating admin user...");

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@mas3ndi.com" },
    });

    if (existingAdmin) {
      console.log("✅ Admin user already exists:", existingAdmin.email);
      console.log("📧 Email:", existingAdmin.email);
      console.log("🔑 Role:", existingAdmin.role);
      console.log("💰 Wallet Balance:", existingAdmin.walletBalance);
      return existingAdmin;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("Admin123!", 12);

    const adminUser = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: "admin@mas3ndi.com",
        password: hashedPassword,
        role: "ADMIN",
        walletBalance: 1000.0, // Give admin some wallet balance for testing
      },
    });

    console.log("🎉 Admin user created successfully!");
    console.log("📧 Email:", adminUser.email);
    console.log("🔑 Password: Admin123!");
    console.log("👤 Role:", adminUser.role);
    console.log("💰 Wallet Balance:", adminUser.walletBalance);
    console.log("");
    console.log(
      "🚀 You can now login with these credentials to access the admin interface!"
    );

    return adminUser;
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Also create a regular test client for comparison
async function createTestClient() {
  try {
    console.log("👤 Creating test client user...");

    // Check if test client already exists
    const existingClient = await prisma.user.findUnique({
      where: { email: "client@mas3ndi.com" },
    });

    if (existingClient) {
      console.log("✅ Test client already exists:", existingClient.email);
      return existingClient;
    }

    // Create test client
    const hashedPassword = await bcrypt.hash("Client123!", 12);

    const clientUser = await prisma.user.create({
      data: {
        name: "Test Client",
        email: "client@mas3ndi.com",
        password: hashedPassword,
        role: "CLIENT",
        walletBalance: 50.0,
      },
    });

    console.log("✅ Test client created successfully!");
    console.log("📧 Email:", clientUser.email);
    console.log("🔑 Password: Client123!");
    console.log("👤 Role:", clientUser.role);
    console.log("💰 Wallet Balance:", clientUser.walletBalance);

    return clientUser;
  } catch (error) {
    console.error("❌ Error creating test client:", error);
  }
}

async function main() {
  console.log("🚀 Setting up test accounts for Mas3ndi platform...");
  console.log("");

  await createAdminUser();
  console.log("");
  await createTestClient();

  console.log("");
  console.log("🎯 Summary:");
  console.log("Admin Login: admin@mas3ndi.com / Admin123!");
  console.log("Client Login: client@mas3ndi.com / Client123!");
  console.log("");
  console.log(
    "🔗 Access the admin interface at: http://localhost:3001/admin/*"
  );
}

main();
