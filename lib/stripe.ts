import 'server-only';
import Stripe from 'stripe';

let client:Stripe|undefined;
export function getStripe(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error('Stripe is not configured.');client??=new Stripe(key);return client}
export function stripePriceId(){const id=process.env.STRIPE_PRICE_ID;if(!id)throw new Error('Stripe price is not configured.');return id}
export function appUrl(){const url=process.env.NEXT_PUBLIC_APP_URL;if(!url)throw new Error('Application URL is not configured.');return url.replace(/\/$/,'')}