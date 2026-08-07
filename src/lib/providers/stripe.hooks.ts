/**
 * stripe.hooks.ts
 *
 * Stripe provider hook implementations.
 *
 * Setup:
 *   1. Install Stripe SDK: npm install stripe (server-side only)
 *   2. Store your Stripe secret key in a Supabase Edge Function
 *      (NEVER in the browser bundle — it's a secret key)
 *   3. Replace the TODO stubs below with calls to your Edge Function
 *      which proxies to the Stripe API
 *   4. Register in subscriptions.queries.ts PROVIDER_HOOKS
 *
 * Example Edge Function call:
 *   const res = await supabase.functions.invoke('stripe-cancel', { body: { subscriptionId } })
 */

import { createProviderHooks, type ProviderHookPayload } from '../subscriptions.queries'

export const stripeHooks = createProviderHooks({
  name: 'stripe',

  onUpgrade: async (payload: ProviderHookPayload) => {
    // TODO: Call Edge Function → stripe.subscriptions.update(stripeSubId, { items: [{ price: newStripePriceId }] })
    console.info('[Stripe] onUpgrade hook triggered', payload)
  },

  onDowngrade: async (payload: ProviderHookPayload) => {
    // TODO: Call Edge Function → stripe.subscriptions.update with new price, proration
    console.info('[Stripe] onDowngrade hook triggered', payload)
  },

  onCancel: async (payload: ProviderHookPayload) => {
    // TODO: immediate → stripe.subscriptions.cancel(stripeSubId)
    //       at_period_end → stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true })
    console.info('[Stripe] onCancel hook triggered', payload)
  },

  onPause: async (payload: ProviderHookPayload) => {
    // TODO: stripe.subscriptions.update(stripeSubId, { pause_collection: { behavior: 'void' } })
    console.info('[Stripe] onPause hook triggered', payload)
  },

  onResume: async (payload: ProviderHookPayload) => {
    // TODO: stripe.subscriptions.update(stripeSubId, { pause_collection: '' })
    console.info('[Stripe] onResume hook triggered', payload)
  },

  onGrantFreeMonths: async (payload: ProviderHookPayload) => {
    // TODO: stripe.subscriptions.update with trial_end extended
    console.info('[Stripe] onGrantFreeMonths hook triggered', payload)
  },

  onManualRenewal: async (payload: ProviderHookPayload) => {
    // TODO: Create a one-off invoice or update the billing cycle anchor
    console.info('[Stripe] onManualRenewal hook triggered', payload)
  },
})
