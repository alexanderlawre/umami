// One-off script to create/promote an admin user.
//
// Usage:
//   ADMIN_EMAIL=admin@umami.io ADMIN_PASSWORD=... npx tsx scripts/create-admin.ts
//
// If ADMIN_PASSWORD is omitted, a secure random password is generated and
// printed once. If the user already exists, they are simply promoted to
// isAdmin: true and their password is left untouched (unless ADMIN_PASSWORD
// is explicitly provided).
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generatePassword(): string {
  return crypto.randomBytes(12).toString("base64url");
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email) {
    console.error("ADMIN_EMAIL is required, e.g. ADMIN_EMAIL=admin@umami.io npx tsx scripts/create-admin.ts");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const data: { isAdmin: boolean; passwordHash?: string } = { isAdmin: true };
    let newPassword: string | null = null;

    if (process.env.ADMIN_PASSWORD) {
      newPassword = process.env.ADMIN_PASSWORD;
      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await prisma.user.update({ where: { email }, data });

    console.log(`Promoted existing user to admin: ${email}`);
    if (newPassword) {
      console.log(`Password reset to: ${newPassword}`);
    } else {
      console.log("Password unchanged.");
    }
    return;
  }

  const password = process.env.ADMIN_PASSWORD || generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name: process.env.ADMIN_NAME || "Admin",
      country: process.env.ADMIN_COUNTRY || "N/A",
      passwordHash,
      isAdmin: true,
    },
  });

  console.log(`Created new admin account:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("\nStore this password somewhere safe — it won't be shown again.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
