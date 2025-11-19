import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not set. Please add it to your .env.local file.'
      );
    }
    
    // Validate key format
    if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      throw new Error(
        'Invalid Stripe secret key format. Keys should start with sk_test_ or sk_live_.'
      );
    }
    
    // Trim whitespace and validate
    const trimmedKey = secretKey.trim();
    
    // Check for common issues
    if (trimmedKey.includes('"') || trimmedKey.includes("'")) {
      throw new Error(
        'Stripe key contains quotes. Remove quotes from STRIPE_SECRET_KEY in .env.local'
      );
    }
    
    if (trimmedKey.length < 50) {
      throw new Error(
        'Stripe key seems too short. Please verify you copied the complete key.'
      );
    }
    
    try {
      stripeInstance = new Stripe(trimmedKey);
    } catch (error: any) {
      // Provide more helpful error messages
      if (error.message?.includes('Invalid API Key')) {
        throw new Error(
          'Invalid Stripe API key. Please verify your key at https://dashboard.stripe.com/apikeys and make sure you copied the complete key (should be ~100+ characters).'
        );
      }
      throw new Error(
        `Failed to initialize Stripe: ${error.message}. Please check your STRIPE_SECRET_KEY.`
      );
    }
  }
  return stripeInstance;
}

// Note: Don't export stripe directly - it will fail if STRIPE_SECRET_KEY is not set
// Use getStripe() function instead, which handles missing keys gracefully

