import { SosHome } from '@/modules/sos';
import { PhoneTakenStatus, PhoneTakenSwipe, usePhoneTaken } from '@/modules/trigger';

export default function SOSScreen() {
  // "Now lock your phone" puts the running card first (round 2, group 1.7).
  const { lockReminder } = usePhoneTaken();
  return (
    <SosHome
      first={<PhoneTakenStatus at="first" />}
      firstShown={lockReminder}
      phoneTaken={<PhoneTakenSwipe />}
      running={<PhoneTakenStatus at="normal" />}
    />
  );
}
