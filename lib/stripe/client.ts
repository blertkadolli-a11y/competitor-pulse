import { loadStripe } from '@stripe/stripe-js';

export const getStripe = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    throw new Error('Stripe publishable key is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file.');
  }
  
  // Validate key format
  if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
    throw new Error('Invalid Stripe publishable key format. Keys should start with pk_test_ or pk_live_.');
  }
  
  return loadStripe(publishableKey);
};

