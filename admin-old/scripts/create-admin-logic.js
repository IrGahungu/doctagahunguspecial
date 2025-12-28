// scripts/create-admin-logic.js
import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Initialize Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function checkEnvVars() {
  console.log("🔍 Checking environment variables...");
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_FULLNAME",
    "ADMIN_PASSWORD",
    "ADMIN_WHATSAPP",
    "ADMIN_COUNTRY",
    "ADMIN_GENDER",
  ];

  requiredVars.forEach((v) => {
    if (!process.env[v]) {
      console.error(`❌ Missing required environment variable: ${v}`);
      process.exit(1);
    }
    console.log(`✅ ${v} is set.`);
  });
}

const run = async () => {
  checkEnvVars();

  const { ADMIN_FULLNAME, ADMIN_PASSWORD, ADMIN_WHATSAPP, ADMIN_COUNTRY, ADMIN_GENDER } = process.env;

  console.log("👤 Admin details to insert:");
  console.log({
    fullname: ADMIN_FULLNAME,
    whatsapp_number: ADMIN_WHATSAPP,
    country: ADMIN_COUNTRY,
    gender: ADMIN_GENDER,
    role: "admin",
    secret_question: "Which part of your body do you love the most?", // Default question
    secret_answer: "Head", // Default answer for admin
  });

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  console.log("🔐 Password hash generated:", hashed);

  // Insert admin and return inserted row
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert([
      {
        fullname: ADMIN_FULLNAME,
        password_hash: hashed,
        whatsapp_number: ADMIN_WHATSAPP,
        country: ADMIN_COUNTRY,
        gender: ADMIN_GENDER,
        role: "admin",
        secret_question: "Which part of your body do you love the most?",
        secret_answer: "Head", // Or any other default you prefer
      },
    ])
    .select() // return the inserted row(s)
    .single(); // get single row object

  if (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }

  console.log("🎉 Successfully created admin user:", data);
  process.exit(0);
};

run();
