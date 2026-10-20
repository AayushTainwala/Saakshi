import { SosHome, useTrustedContacts } from '@/modules/sos';
import { ConfiscationCard } from '@/modules/trigger';

export default function SOSScreen() {
  const contacts = useTrustedContacts();
  return (
    <SosHome>
      <ConfiscationCard hasContacts={contacts.length > 0} />
    </SosHome>
  );
}
