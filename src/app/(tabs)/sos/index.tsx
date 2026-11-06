import { SosHome } from '@/modules/sos';
import { PhoneTakenStatus, PhoneTakenSwipe } from '@/modules/trigger';

export default function SOSScreen() {
  return <SosHome phoneTaken={<PhoneTakenSwipe />} running={<PhoneTakenStatus />} />;
}
