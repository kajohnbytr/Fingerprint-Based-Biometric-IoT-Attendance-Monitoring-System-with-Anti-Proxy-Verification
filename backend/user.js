import mongoose from 'mongoose';
   import dotenv from 'dotenv';
   import User from './models/User.js';
   
   dotenv.config();
   
   const createUser = async () => {
     try {
       await mongoose.connect(process.env.MONGO_URI);
       console.log('MongoDB Connected');
       
       // Delete existing user if exists
       await User.deleteOne({ email: 'student@test.com' });
       
       // Create student user
       const student = await User.create({
         email: 'student@test.com',
         password: 'password123',
         roles: ['student']
       });
       
       console.log('Student created:', student.email);
       
       // Create admin user
       await User.deleteOne({ email: 'admin@test.com' });
       const admin = await User.create({
         email: 'admin@test.com',
         password: 'password123',
         roles: ['admin']
       });
       
       console.log('Admin created:', admin.email);
       
       // Create super_admin user
       await User.deleteOne({ email: 'superadmin@test.com' });
       const superAdmin = await User.create({
         email: 'superadmin@test.com',
         password: 'password123',
         roles: ['super_admin']
       });
       
       console.log('Super Admin created:', superAdmin.email);
       
       process.exit(0);
     } catch (error) {
       console.error('Error:', error);
       process.exit(1);
     }
   };
   
   createUser();