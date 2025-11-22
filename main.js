import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import invoiceRoute from './routes/invoiceRoutes.js';
import { protectRoute } from './middleware/auth.js';

dotenv.config({quiet: true});
const PORT  = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api', authRoutes)
app.use('/api', invoiceRoute)

app.get('/', protectRoute, (req, res) => {
    res.status(200).json({"message": "hi there!"})
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})