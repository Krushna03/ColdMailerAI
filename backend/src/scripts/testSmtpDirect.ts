import nodemailer from "nodemailer";

async function testPassword(pass: string, label: string) {
  const cleanPass = pass.replace(/\s+/g, "");
  console.log(`\nTesting ${label} ("${cleanPass.slice(0, 4)}...${cleanPass.slice(-4)}") on port 465 (SSL)...`);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "krushnasakhare965@gmail.com",
      pass: cleanPass,
    },
    connectionTimeout: 10000,
  });

  try {
    await transporter.verify();
    console.log(`SUCCESS! ${label} verified on port 465!`);
    return true;
  } catch (err: any) {
    console.log(`Failed: ${err.message}`);
    return false;
  }
}

async function run() {
  await testPassword("mnnsoiqxktjidvyy", "EMAIL_PASS line 60");
  await testPassword("vipl xirv dqas urvr", "vipl... line 86");
  process.exit(0);
}

run();
