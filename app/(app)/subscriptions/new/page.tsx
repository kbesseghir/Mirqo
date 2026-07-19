import { AddMethodPicker } from '@/components/subscriptions/add-method-picker';
import { SubscriptionForm } from '@/components/subscriptions/subscription-form';
import { createClient } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/plan';

export default async function Page({searchParams}:{searchParams:{method?:string}}){
  if(searchParams.method!=='manual') return <AddMethodPicker/>;
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  const[{count},{data:profile}]=await Promise.all([supabase.from('subscriptions').select('id',{count:'exact',head:true}).eq('user_id',user!.id),supabase.from('profiles').select('plan,is_pro,trial_ends_at,activation_ends_at,preferred_currency').eq('user_id',user!.id).maybeSingle()]);
  return <SubscriptionForm subscriptionCount={count??0} isPro={hasUnlimitedAccess(profile)} defaultCurrency={profile?.preferred_currency??'USD'}/>;
}