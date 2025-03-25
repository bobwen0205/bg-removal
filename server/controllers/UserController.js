import { Webhook } from "svix"
import userModel from "../models/userModel.js";
import transactionModel from "../models/transactionModel.js";
import Stripe from "stripe";

// API Controller Function to Manage Clerk User with Database
// http://localhost:4000/api/user/webhooks
export const clerkWebhooks = async (req, res) => {
    try {
        // Create a Svix instance with clerk webhook secret.
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
        await whook.verify(JSON.stringify(req.body), {
            'svix-id': req.headers['svix-id'],
            'svix-timestamp': req.headers['svix-timestamp'],
            'svix-signature': req.headers['svix-signature']
        })
        const { data, type } = req.body

        switch (type) {
            case 'user.created': {
                const userData = {
                    clerkId: data.id,
                    email: data.email_addresses[0].email_address,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    photo: data.image_url,
                }
                await userModel.create(userData)
                res.json({})
                break
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_address[0].email_address,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    photo: data.image_url,
                }
                await userModel.findOneAndUpdate({ clerkId: data.id }, userData)
                res.json({})
                break
            }

            case 'user.deleted': {
                await userModel.findOneAndDelete({ clerkId: data.id })
                res.json({})
                break
            }

            default:
                break;
        }
    } catch (error) {
        res.json({ success: false, message: error.message });

    }
}


// API Controller function to get user available credits data
export const userCredits = async (req, res) => {
    try {
        const { clerkId } = req.body;

        const userData = await userModel.findOne({ clerkId });

        res.json({ success: true, credits: userData.creditBalance });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// API to make payment for credits
export const paymentStripe = async (req, res) => {
    try {
        const { clerkId, planId } = req.body;
        const { origin } = req.headers;
        const userData = await userModel.findOne({ clerkId });
        if (!userData || !planId) {
            return res.json({ success: false, message: 'Invalid Credentials' });
        }
        let credits, plan, amount, date;
        switch (planId) {
            case 'Basic':
                plan = 'Basic';
                credits = 100;
                amount = 10;
                break;
            case 'Advanced':
                plan = 'Advanced';
                credits = 500;
                amount = 50;
                break;
            case 'Business':
                plan = 'Business';
                credits = 5000;
                amount = 250;
                break;
            default:
                break;
        }
        date = Date.now();
        // Creating Transaction
        const transactionData = {
            clerkId,
            plan,
            amount,
            credits,
            date,
        };

        const newTransaction = await transactionModel.create(transactionData);
        // Stripe Gateway Initialize
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        const currency = process.env.CURRENCY.toLowerCase();
        // Creating line items for Stripe
        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: transactionData.plan,
                },
                unit_amount: Math.floor(newTransaction.amount) * 100
            },
            quantity: 1
        }]
        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/`,
            cancel_url: `${origin}/buy`,
            line_items: line_items,
            mode: 'payment',
            metadata: {
                transactionId: newTransaction._id.toString(),
            }
        })
        res.json({ success: true, session_url: session.url });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}