import { useRouter } from 'expo-router';

import { GuideList } from '@/modules/guides';

export default function GuidesScreen() {
  const router = useRouter();
  return <GuideList onOpen={(guide) => router.push({ pathname: '/guides/[guide]', params: { guide } })} />;
}
