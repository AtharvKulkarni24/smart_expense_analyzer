const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const CATEGORIES = [
  { id: 1, name: 'Food & Dining', isDefault: true },
  { id: 2, name: 'Groceries', isDefault: true },
  { id: 3, name: 'Transport', isDefault: true },
  { id: 4, name: 'Shopping', isDefault: true },
  { id: 5, name: 'Bills & Utilities', isDefault: true },
  { id: 6, name: 'Entertainment', isDefault: true },
  { id: 7, name: 'Healthcare', isDefault: true },
  { id: 8, name: 'Education', isDefault: true },
  { id: 9, name: 'Travel', isDefault: true },
  { id: 10, name: 'Other', isDefault: true },
];

const INITIAL_TRANSACTIONS = [
  { amount: 450.00, currency: 'INR', description: 'Zomato Biryani Order', merchant: 'Zomato', categoryId: 1, transactionDate: '2026-03-24', source: 'manual' },
  { amount: 1250.00, currency: 'INR', description: 'Blinkit Instant Groceries', merchant: 'Blinkit', categoryId: 2, transactionDate: '2026-03-23', source: 'manual' },
  { amount: 320.00, currency: 'INR', description: 'Uber Ride to Tech Park', merchant: 'Uber', categoryId: 3, transactionDate: '2026-03-22', source: 'manual' },
  { amount: 2499.00, currency: 'INR', description: 'Amazon Wireless Headphones', merchant: 'Amazon', categoryId: 4, transactionDate: '2026-03-21', source: 'csv' },
  { amount: 1450.00, currency: 'INR', description: 'Electricity Board Bill', merchant: 'MSEB', categoryId: 5, transactionDate: '2026-03-20', source: 'manual' },
  { amount: 499.00, currency: 'INR', description: 'Netflix Monthly Premium', merchant: 'Netflix', categoryId: 6, transactionDate: '2026-03-18', source: 'manual' },
  { amount: 620.00, currency: 'INR', description: 'Apollo Pharmacy Prescription', merchant: 'Apollo', categoryId: 7, transactionDate: '2026-03-17', source: 'manual' },
  { amount: 1200.00, currency: 'INR', description: 'Data Mining Lab Manuals & Books', merchant: 'University Bookstore', categoryId: 8, transactionDate: '2026-03-16', source: 'manual' },
  { amount: 3800.00, currency: 'INR', description: 'IRCTC Express Train Ticket', merchant: 'IRCTC', categoryId: 9, transactionDate: '2026-03-15', source: 'csv' },
  { amount: 4200.00, currency: 'INR', description: 'Luxury Weekend Dinner Buffet', merchant: 'Taj Grand Dining', categoryId: 1, transactionDate: '2026-03-14', source: 'manual' }, // Anomaly!
  { amount: 850.00, currency: 'INR', description: 'Swiggy Gourmet Pizza', merchant: 'Swiggy', categoryId: 1, transactionDate: '2026-03-12', source: 'manual' },
  { amount: 1950.00, currency: 'INR', description: 'Nature Basket Supermarket', merchant: 'Nature Basket', categoryId: 2, transactionDate: '2026-03-10', source: 'manual' },
  { amount: 280.00, currency: 'INR', description: 'Metro Smart Card Recharge', merchant: 'Metro', categoryId: 3, transactionDate: '2026-03-08', source: 'manual' },
  { amount: 1800.00, currency: 'INR', description: 'Zara Cotton Casual Shirt', merchant: 'Zara', categoryId: 4, transactionDate: '2026-03-05', source: 'manual' },
  { amount: 999.00, currency: 'INR', description: 'Airtel Broadband Wi-Fi Bill', merchant: 'Airtel', categoryId: 5, transactionDate: '2026-03-02', source: 'manual' },
];

const INITIAL_BUDGETS = [
  { categoryId: 1, month: '2026-03', limitAmount: 7000.00 },
  { categoryId: 2, month: '2026-03', limitAmount: 4000.00 },
  { categoryId: 3, month: '2026-03', limitAmount: 2000.00 },
  { categoryId: 4, month: '2026-03', limitAmount: 5000.00 },
  { categoryId: 5, month: '2026-03', limitAmount: 3000.00 },
  { categoryId: 6, month: '2026-03', limitAmount: 1500.00 },
  { categoryId: 7, month: '2026-03', limitAmount: 2000.00 },
  { categoryId: 8, month: '2026-03', limitAmount: 2500.00 },
  { categoryId: 9, month: '2026-03', limitAmount: 5000.00 },
  { categoryId: 10, month: '2026-03', limitAmount: 2000.00 },
];

async function main() {
  console.log('Seeding SpendSense database...');

  // 1. Seed Categories
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name },
      create: cat,
    });
  }
  console.log('✓ 10 Categories seeded.');

  // 2. Seed Default Demo User
  const passwordHash = await bcrypt.hash('password123', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'atharv@example.com' },
    update: { name: 'Atharv Kulkarni' },
    create: {
      name: 'Atharv Kulkarni',
      email: 'atharv@example.com',
      passwordHash,
    },
  });
  console.log(`✓ Demo user ready: ${demoUser.email} (Password: password123)`);

  // 3. Clear existing transactions for clean re-seed
  await prisma.transaction.deleteMany({ where: { userId: demoUser.id } });

  // 4. Seed Transactions
  for (const tx of INITIAL_TRANSACTIONS) {
    await prisma.transaction.create({
      data: {
        userId: demoUser.id,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        merchant: tx.merchant,
        categoryId: tx.categoryId,
        transactionDate: tx.transactionDate,
        source: tx.source,
      },
    });
  }
  console.log(`✓ ${INITIAL_TRANSACTIONS.length} Transactions seeded.`);

  // 5. Seed Budgets
  for (const bgt of INITIAL_BUDGETS) {
    await prisma.budget.upsert({
      where: {
        userId_categoryId_month: {
          userId: demoUser.id,
          categoryId: bgt.categoryId,
          month: bgt.month,
        },
      },
      update: { limitAmount: bgt.limitAmount },
      create: {
        userId: demoUser.id,
        categoryId: bgt.categoryId,
        month: bgt.month,
        limitAmount: bgt.limitAmount,
      },
    });
  }
  console.log('✓ Monthly category budgets seeded.');

  // 6. Seed Spending Profile
  await prisma.spendingProfile.upsert({
    where: {
      userId_periodMonth: {
        userId: demoUser.id,
        periodMonth: '2026-03',
      },
    },
    update: {
      clusterId: 2,
      profileLabel: 'Dining & Food Heavy Spender',
      summary: '32% of monthly spending allocated to Food & Dining, followed by 18% on Groceries. Discretionary spending remains controlled.',
    },
    create: {
      userId: demoUser.id,
      periodMonth: '2026-03',
      clusterId: 2,
      profileLabel: 'Dining & Food Heavy Spender',
      summary: '32% of monthly spending allocated to Food & Dining, followed by 18% on Groceries. Discretionary spending remains controlled.',
      modelVersion: 'kmeans-v1.0.0',
    },
  });
  console.log('✓ Spending profile seeded.');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
