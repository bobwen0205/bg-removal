import Stripe from "stripe";
import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

export const stripeWebhooks = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            {
                const paymentIntent = event.data.object;
                const paymentIntentId = paymentIntent.id;
                const session = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId
                })
                const { transactionId } = session.data[0].metadata;
                const transactionData = await transactionModel.findById(transactionId);
                transactionData.payment = true;
                await transactionData.save();

                const { clerkId } = transactionData;
                const userData = await userModel.findOne({ clerkId });
                userData.creditBalance += transactionData.credits;
                await userData.save();

                break;
            }
        case 'payment_intent.payment_failed':
            {
                const paymentIntent = event.data.object;
                const paymentIntentId = paymentIntent.id;
                const session = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId
                })
                const { transactionId } = session.data[0].metadata;
                const transactionData = await transactionModel.findById(transactionId);
                transactionData.payment = false;
                await transactionData.save();
                break;
            }
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
}