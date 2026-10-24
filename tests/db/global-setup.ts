import { setupDatabase } from "../../scripts/local-supabase/setup-db";

export const TEST_DATABASE = "form_test";

export default async function globalSetup() {
  await setupDatabase(TEST_DATABASE);
}
