import type { Metadata } from 'next';
import Atlas from '@/components/atlas/Atlas';

export const metadata: Metadata = { title: 'SceneAtlas', description: 'Every movie has a world. Explore it.' };

export default function AtlasPage() {
  return <Atlas />;
}
