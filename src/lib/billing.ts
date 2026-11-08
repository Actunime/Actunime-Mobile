import type { IMemberAppearanceBody } from '@actunime/validations';

import { api as client } from './client';
import type { IAppearanceResponse, IBillingAvailability, IBillingStatus, SupporterPlan } from './billing-model';

export * from './billing-model';

const http = () => client().getHttp();

export const billingApi = {
  availability: async () => (await http().get<IBillingAvailability>('/billing/availability')).data,
  status: async () => (await http().get<IBillingStatus>('/billing/me')).data,
  checkout: async (plan: SupporterPlan) => (await http().post<{ url: string }>('/billing/checkout', { plan })).data,
  portal: async () => (await http().post<{ url: string }>('/billing/portal')).data,
  cancel: async () => (await http().post<IBillingStatus>('/billing/subscription/cancel')).data,
  resume: async () => (await http().post<IBillingStatus>('/billing/subscription/resume')).data,
  appearance: async () => (await http().get<IAppearanceResponse>('/billing/appearance')).data,
  saveAppearance: async (body: IMemberAppearanceBody) => (await http().put<IAppearanceResponse>('/billing/appearance', body)).data,
};
