//hashPassord.jsx under src/pages folder

// Import bcrypt using ES module syntax
import bcrypt from 'bcrypt';

const saltRounds = 10;
const myPlaintextPassword = 'gh123456';

// Use bcrypt to hash the password
bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
  // Now `hash` is the hashed password you can use in your SQL command
  console.log(hash);
  // You can replace the console.log with your SQL command logic if needed
});