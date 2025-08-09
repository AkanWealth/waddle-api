// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// async function createFunctions() {
//   try {
//     // Create the functions
//     await prisma.$executeRaw`
//       CREATE OR REPLACE FUNCTION generate_custom_id(prefix TEXT)
//       RETURNS TEXT AS $$
//       DECLARE
//           random_part TEXT;
//           result TEXT;
//       BEGIN
//           -- Generate 5 random alphanumeric characters (uppercase)
//           random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 5));
//           result := prefix || random_part;
//           RETURN result;
//       END;
//       $$ LANGUAGE plpgsql;
//     `;

//     await prisma.$executeRaw`
//       CREATE OR REPLACE FUNCTION generate_unique_id(table_name TEXT, prefix TEXT)
//       RETURNS TEXT AS $$
//       DECLARE
//           new_id TEXT;
//           exists_check INTEGER;
//       BEGIN
//           LOOP
//               new_id := generate_custom_id(prefix);

//               -- Check if ID already exists in the specified table
//               EXECUTE format('SELECT COUNT(*) FROM "%I" WHERE id = $1', table_name)
//               USING new_id INTO exists_check;

//               -- If ID doesn't exist, we can use it
//               IF exists_check = 0 THEN
//                   EXIT;
//               END IF;
//           END LOOP;

//           RETURN new_id;
//       END;
//       $$ LANGUAGE plpgsql;
//     `;

//     console.log('✅ Functions created successfully!');

//     // Test the functions
//     const testResult =
//       await prisma.$queryRaw`SELECT generate_unique_id(${'user'}, ${'USR-'}) as test_id`;
//     console.log('🧪 Test ID generated:', testResult);
//   } catch (error) {
//     console.error('❌ Error creating functions:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }
