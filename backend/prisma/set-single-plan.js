import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function setSingleAnnualPlan() {
  console.log('Configuring single Basic Plan (₹5,000/yr) in database...');

  // 1. Create or upsert the single Basic Plan
  const existingLegacy = await prisma.plan.findUnique({
    where: { name: 'Standard Annual Plan' },
  });

  let singlePlan;
  if (existingLegacy) {
    singlePlan = await prisma.plan.update({
      where: { id: existingLegacy.id },
      data: {
        name: 'Basic Plan',
        description: 'Perfect for small restaurants and cafes.',
        price: 5000.00,
        durationDays: 365,
        maxStaff: 14,
        maxWaiters: 10,
        maxKitchenAdmins: 2,
        maxReceptionists: 2,
        features: [
          '10 Service Waiters (POS & Floor Map)',
          '2 Kitchen Admins (Live KDS & Recipes)',
          '2 Receptionists (Billing & Cashier)',
          'Role-based user access control',
          'Complete Restaurant Operations & Reports',
          'Menu & Dining Table Management',
        ],
        isActive: true,
      },
    });
  } else {
    singlePlan = await prisma.plan.upsert({
      where: { name: 'Basic Plan' },
      update: {
        description: 'Perfect for small restaurants and cafes.',
        price: 5000.00,
        durationDays: 365,
        maxStaff: 14,
        maxWaiters: 10,
        maxKitchenAdmins: 2,
        maxReceptionists: 2,
        features: [
          '10 Service Waiters (POS & Floor Map)',
          '2 Kitchen Admins (Live KDS & Recipes)',
          '2 Receptionists (Billing & Cashier)',
          'Role-based user access control',
          'Complete Restaurant Operations & Reports',
          'Menu & Dining Table Management',
        ],
        isActive: true,
      },
      create: {
        name: 'Basic Plan',
        description: 'Perfect for small restaurants and cafes.',
        price: 5000.00,
        durationDays: 365,
        maxStaff: 14,
        maxWaiters: 10,
        maxKitchenAdmins: 2,
        maxReceptionists: 2,
        features: [
          '10 Service Waiters (POS & Floor Map)',
          '2 Kitchen Admins (Live KDS & Recipes)',
          '2 Receptionists (Billing & Cashier)',
          'Role-based user access control',
          'Complete Restaurant Operations & Reports',
          'Menu & Dining Table Management',
        ],
        isActive: true,
      },
    });
  }

  console.log(`Single Plan active: ${singlePlan.name} (ID: ${singlePlan.id}) - Price: ${singlePlan.price}/year`);

  // 2. Re-point ALL subscriptions to this single plan
  const updatedSubs = await prisma.subscription.updateMany({
    data: {
      planId: singlePlan.id,
      status: 'ACTIVE',
    },
  });
  console.log(`Re-pointed ${updatedSubs.count} restaurant subscriptions to the single Basic Plan.`);

  // 3. Delete or deactivate any old plans so only this one plan exists
  const otherPlans = await prisma.plan.findMany({
    where: {
      id: { not: singlePlan.id },
    },
  });

  for (const oldPlan of otherPlans) {
    try {
      await prisma.plan.delete({ where: { id: oldPlan.id } });
      console.log(`Deleted old plan: ${oldPlan.name}`);
    } catch {
      await prisma.plan.update({
        where: { id: oldPlan.id },
        data: { isActive: false },
      });
      console.log(`Archived old plan: ${oldPlan.name}`);
    }
  }

  // 4. Verify only the single active plan exists
  const activePlans = await prisma.plan.findMany({ where: { isActive: true } });
  console.log(`Active plans count: ${activePlans.length}`);
  for (const p of activePlans) {
    console.log(` -> ${p.name}: ₹${p.price}/year (${p.maxWaiters} Waiters, ${p.maxKitchenAdmins} Kitchen Admins, ${p.maxReceptionists} Receptionists)`);
  }
}

setSingleAnnualPlan()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
