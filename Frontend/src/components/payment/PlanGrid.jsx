import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPlanAmount } from './utils';

const PlanGrid = ({ plans, plansLoading, user, onSelectPlan }) => {
  if (plansLoading) {
    return (
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`plan-skeleton-${index}`}
            className="rounded-3xl border border-white/5 bg-white/5 p-6 animate-pulse space-y-4"
          >
            <div className="h-4 w-32 rounded bg-white/20" />
            <div className="h-10 w-24 rounded bg-white/20" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, featureIdx) => (
                <div key={featureIdx} className="h-3 w-full rounded bg-white/10" />
              ))}
            </div>
            <div className="h-11 w-full rounded bg-white/15" />
          </div>
        ))}
      </section>
    );
  }

  if (!plans.length) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
        No plans available at the moment. Please check back later.
      </section>
    );
  }

  const hasActivePlan = user?.isPaidUser && user?.planName && user.planName !== 'Free';

  return (
    <section className="space-y-9">
      <div className="flex items-center justify-center text-center">
        <div>
          <p className="text-2xl uppercase tracking-[0.05em] text-slate-100">Plans</p>
          <h2 className="text-xl font-semibold text-slate-200">Choose what fits your workflow</h2>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan =
            user?.planName?.toLowerCase() === plan.name?.toLowerCase() && hasActivePlan;
          const isCustomPlan = Boolean(plan.isCustom);
          const isFreePlan = !plan.requiresPayment && !isCustomPlan;
          const isDisabled = isFreePlan || isCurrentPlan;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border bg-white/5 p-6 backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-white/30 ${
                plan.popular ? 'border-brand/60 ring-1 ring-brand/50' : 'border-white/10'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-medium">
                  Most popular
                </span>
              )}
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                  {plan.billingPeriod || 'one-time'}
                </p>
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                  {plan.name}
                  {isCurrentPlan && (
                    <Badge className="bg-white/10 text-white border-white/20">Current</Badge>
                  )}
                </h3>
                <p className="text-4xl font-bold text-white">
                  {isCustomPlan
                    ? 'Custom'
                    : formatPlanAmount(plan.amount, plan.currency || 'USD')}
                  {!isCustomPlan && plan.amount > 0 && (
                    <span className="text-base font-normal text-slate-400">
                      {' '}
                      / {plan.billingPeriod || 'month'}
                    </span>
                  )}
                  {isCustomPlan && (
                    <span className="text-base font-normal text-slate-400"> pricing</span>
                  )}
                </p>
                {plan.description && (
                  <p className="text-sm text-slate-300">{plan.description}</p>
                )}
                <ul className="space-y-2 text-sm text-slate-200">
                  {plan.features?.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-brand" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                onClick={() => onSelectPlan(plan.id)}
                disabled={isDisabled}
                className={`mt-6 w-full ${
                  isDisabled
                    ? 'cursor-not-allowed bg-slate-600/60 text-slate-200'
                    : 'bg-brand text-white hover:bg-brand-400'
                }`}
              >
                {isFreePlan
                  ? 'Included in your workspace'
                  : isCurrentPlan
                    ? 'Current plan'
                    : plan.buttonText || (isCustomPlan ? 'Contact sales' : 'Choose Plan')}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PlanGrid;